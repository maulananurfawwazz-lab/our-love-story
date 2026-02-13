// ═══════════════════════════════════════════════════════════════
// useRealtimeTable – Universal realtime CRUD hook
// ═══════════════════════════════════════════════════════════════
// Provides: data[], loading, insert/update/remove with optimistic UI,
// and automatic Supabase Realtime subscription for INSERT/UPDATE/DELETE.
//
// Usage:
//   const { data, loading, insert, update, remove } = useRealtimeTable<ChatMsg>({
//     table: 'chat_messages',
//     coupleId: profile.couple_id,
//     orderBy: { column: 'created_at', ascending: true },
//     limit: 200,
//   });
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Since push_subscriptions is not in the generated types, we use 'as any' for .from()
// For typed tables: the generic T is only used on the client-side; the actual DB
// schema types come from Supabase. We use `any` for .from() calls to avoid
// type mismatches with auto-generated types that may be stale.

export interface RealtimeTableConfig<T extends { id: string }> {
  /** Supabase table name */
  table: string;
  /** Filter by couple_id (column must exist on the table) */
  coupleId: string | null | undefined;
  /** Optional: column + direction for ordering */
  orderBy?: { column: keyof T & string; ascending: boolean };
  /** Max rows to fetch (default 100) */
  limit?: number;
  /** Extra filters: { column, value } */
  filters?: { column: string; value: string | number | boolean }[];
  /** Whether to enable the hook (default: true). Useful for conditional usage */
  enabled?: boolean;
}

export interface RealtimeTableReturn<T extends { id: string }> {
  data: T[];
  loading: boolean;
  /** Optimistic insert – appends to list immediately, then syncs with DB */
  insert: (row: Partial<T> & Record<string, unknown>) => Promise<T | null>;
  /** Optimistic update by id */
  update: (id: string, patch: Partial<T> & Record<string, unknown>) => Promise<boolean>;
  /** Optimistic delete by id */
  remove: (id: string) => Promise<boolean>;
  /** Force re-fetch from server */
  refresh: () => Promise<void>;
  /** Replace local state directly (for complex scenarios) */
  setData: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useRealtimeTable<T extends { id: string }>(
  config: RealtimeTableConfig<T>
): RealtimeTableReturn<T> {
  const {
    table,
    coupleId,
    orderBy,
    limit = 100,
    filters = [],
    enabled = true,
  } = config;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  // Track IDs to avoid duplicates from optimistic + realtime
  const knownIds = useRef(new Set<string>());

  // ─── Fetch ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!coupleId || !enabled) { setLoading(false); return; }
    try {
      let query = (supabase.from(table as any) as any)
        .select('*')
        .eq('couple_id', coupleId);

      for (const f of filters) {
        query = query.eq(f.column, f.value);
      }

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending });
      }

      query = query.limit(limit);

      const { data: rows, error } = await query;
      if (error) { console.error(`[RT:${table}] fetch error`, error); return; }
      if (rows) {
        setData(rows as T[]);
        knownIds.current = new Set((rows as T[]).map(r => r.id));
      }
    } finally {
      setLoading(false);
    }
  }, [table, coupleId, enabled, limit, JSON.stringify(orderBy), JSON.stringify(filters)]);

  // ─── Initial fetch ──────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // ─── Realtime subscription ──────────────────────────────
  useEffect(() => {
    if (!coupleId || !enabled) return;

    const channelName = `rt-${table}-${coupleId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const evt = payload.eventType;
          if (evt === 'INSERT') {
            const row = payload.new as T;
            if (knownIds.current.has(row.id)) {
              // Replace optimistic version with server version
              setData(prev => prev.map(r => r.id === row.id ? row : r));
            } else {
              knownIds.current.add(row.id);
              // Respect ordering: prepend (desc) or append (asc)
              if (orderBy?.ascending === true) {
                setData(prev => [...prev, row]);
              } else {
                setData(prev => [row, ...prev]);
              }
            }
          } else if (evt === 'UPDATE') {
            const row = payload.new as T;
            setData(prev => prev.map(r => r.id === row.id ? { ...r, ...row } : r));
          } else if (evt === 'DELETE') {
            const oldRow = payload.old as { id: string };
            if (oldRow?.id) {
              knownIds.current.delete(oldRow.id);
              setData(prev => prev.filter(r => r.id !== oldRow.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, coupleId, enabled, orderBy?.ascending, orderBy?.column]);

  // ─── Optimistic INSERT ──────────────────────────────────
  const insert = useCallback(async (row: Partial<T> & Record<string, unknown>): Promise<T | null> => {
    if (!coupleId) return null;

    // Create optimistic row
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimistic = {
      ...row,
      id: tempId,
      couple_id: coupleId,
      created_at: new Date().toISOString(),
    } as unknown as T;

    knownIds.current.add(tempId);

    // Optimistic: add to list immediately
    if (orderBy?.ascending === true) {
      setData(prev => [...prev, optimistic]);
    } else {
      setData(prev => [optimistic, ...prev]);
    }

    try {
      const insertPayload = { ...row, couple_id: coupleId } as Record<string, unknown>;
      delete insertPayload.id; // let DB generate the real id

      const { data: inserted, error } = await (supabase.from(table as any) as any)
        .insert(insertPayload)
        .select('*')
        .maybeSingle();

      if (error) {
        // Rollback optimistic
        knownIds.current.delete(tempId);
        setData(prev => prev.filter(r => r.id !== tempId));
        console.error(`[RT:${table}] insert error`, error);
        return null;
      }

      if (inserted) {
        // Replace temp with real row
        knownIds.current.delete(tempId);
        knownIds.current.add((inserted as T).id);
        setData(prev => prev.map(r => r.id === tempId ? (inserted as T) : r));
        return inserted as T;
      }
      return null;
    } catch (err) {
      knownIds.current.delete(tempId);
      setData(prev => prev.filter(r => r.id !== tempId));
      console.error(`[RT:${table}] insert exception`, err);
      return null;
    }
  }, [table, coupleId, orderBy?.ascending]);

  // ─── Optimistic UPDATE ──────────────────────────────────
  const update = useCallback(async (id: string, patch: Partial<T> & Record<string, unknown>): Promise<boolean> => {
    // Save prev for rollback
    const prev = data.find(r => r.id === id);
    if (!prev) return false;

    // Optimistic update
    setData(d => d.map(r => r.id === id ? { ...r, ...patch } : r));

    try {
      const { error } = await (supabase.from(table as any) as any)
        .update(patch)
        .eq('id', id);

      if (error) {
        // Rollback
        setData(d => d.map(r => r.id === id ? prev : r));
        console.error(`[RT:${table}] update error`, error);
        return false;
      }
      return true;
    } catch (err) {
      setData(d => d.map(r => r.id === id ? prev : r));
      return false;
    }
  }, [table, data]);

  // ─── Optimistic DELETE ──────────────────────────────────
  const remove = useCallback(async (id: string): Promise<boolean> => {
    const prev = data;
    // Optimistic remove
    knownIds.current.delete(id);
    setData(d => d.filter(r => r.id !== id));

    try {
      const { error } = await (supabase.from(table as any) as any)
        .delete()
        .eq('id', id);

      if (error) {
        setData(prev);
        knownIds.current.add(id);
        console.error(`[RT:${table}] delete error`, error);
        return false;
      }
      return true;
    } catch (err) {
      setData(prev);
      knownIds.current.add(id);
      return false;
    }
  }, [table, data]);

  return {
    data,
    loading,
    insert,
    update,
    remove,
    refresh: fetchData,
    setData,
  };
}
