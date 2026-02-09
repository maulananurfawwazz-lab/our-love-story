
-- Add start_date to couples table
ALTER TABLE public.couples ADD COLUMN start_date date;

-- Allow couple members to update their couple (for setting start_date)
CREATE POLICY "Couple members can update couple"
ON public.couples
FOR UPDATE
USING (id = get_couple_id(auth.uid()));

-- Allow couple members to delete timeline events
CREATE POLICY "Couple can delete timeline events"
ON public.timeline_events
FOR DELETE
USING (couple_id = get_couple_id(auth.uid()));

-- Allow couple members to update timeline events
CREATE POLICY "Couple can update timeline events"
ON public.timeline_events
FOR UPDATE
USING (couple_id = get_couple_id(auth.uid()));
