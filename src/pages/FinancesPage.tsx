import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Plus } from 'lucide-react';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

interface Finance {
  id: string;
  user_id: string;
  type: string;
  category: string;
  amount: number;
  date: string;
}

const CATEGORIES = ['Makanan', 'Transportasi', 'Belanja', 'Hiburan', 'Tabungan', 'Lainnya'];

const FinancesPage = () => {
  const { user, profile } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Makanan');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: records, insert } = useRealtimeTable<Finance>({
    table: 'finances',
    coupleId: profile?.couple_id,
    orderBy: { column: 'date', ascending: false },
    limit: 50,
  });

  const addRecord = async () => {
    if (!amount || !profile?.couple_id || !user) return;
    await insert({
      user_id: user.id,
      type,
      category,
      amount: parseFloat(amount),
      date,
    });
    setAmount('');
    setShowAdd(false);
  };

  const totalIncome = records.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0);
  const totalExpense = records.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0);

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <div className="px-5 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-script text-2xl text-gradient-love">Keuangan 💰</h1>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(!showAdd)} className="p-2.5 rounded-xl bg-primary text-primary-foreground">
          <Plus size={18} />
        </motion.button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Pemasukan</p>
          <p className="text-sm font-bold text-green-600">{fmt(totalIncome)}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Pengeluaran</p>
          <p className="text-sm font-bold text-destructive">{fmt(totalExpense)}</p>
        </div>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-card p-4 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setType('income')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${type === 'income' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>Pemasukan</button>
            <button onClick={() => setType('expense')} className={`flex-1 py-2 rounded-xl text-sm font-medium ${type === 'expense' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>Pengeluaran</button>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Jumlah"
            className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${category === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                {c}
              </button>
            ))}
          </div>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none text-foreground" />
          <motion.button whileTap={{ scale: 0.98 }} onClick={addRecord} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Simpan
          </motion.button>
        </motion.div>
      )}

      {/* Records */}
      <div className="space-y-2">
        {records.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-card p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{r.category}</p>
              <p className="text-xs text-muted-foreground">{r.date}</p>
            </div>
            <p className={`text-sm font-bold ${r.type === 'income' ? 'text-green-600' : 'text-destructive'}`}>
              {r.type === 'income' ? '+' : '-'}{fmt(Number(r.amount))}
            </p>
          </motion.div>
        ))}
      </div>

      {records.length === 0 && !showAdd && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-muted-foreground text-sm">Belum ada catatan keuangan</p>
        </div>
      )}
    </div>
  );
};

export default FinancesPage;
