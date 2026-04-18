import { supabase } from '../lib/supabase';

const checkExpiredSingle = (dialers) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return dialers.map(d => {
    const end = new Date(d.end_date); end.setHours(0, 0, 0, 0);
    return (end < today && d.status !== 'Unpaid') ? { ...d, status: 'Unpaid' } : d;
  });
};

export async function fetchDialers() {
  const { data, error } = await supabase
    .from('dialers')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return checkExpiredSingle(data || []);
}

export async function createDialer(fields) {
  const { data, error } = await supabase
    .from('dialers')
    .insert(fields)
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteDialer(id) {
  const { error } = await supabase.from('dialers').delete().eq('id', id);
  if (error) throw error;
}

export async function updateDialerStatus(id, status) {
  const { error } = await supabase.from('dialers').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function bulkInsertDialers(dialersArray) {
  const { data, error } = await supabase.from('dialers').insert(dialersArray).select();
  if (error) throw error;
  return data || [];
}
