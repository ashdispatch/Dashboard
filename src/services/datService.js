import { supabase } from '../lib/supabase';

const DAT_TYPES = ['Single Search', 'Double Search', 'Unlimited Search'];

// Auto-expire check (client-side)
const checkExpired = (users) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return users.map(u => {
    const end = new Date(u.end_date); end.setHours(0, 0, 0, 0);
    return (end < today && u.status !== 'Unpaid') ? { ...u, status: 'Unpaid' } : u;
  });
};

// Build nested structure from flat DB rows
export function buildNestedStructure(mails, users) {
  return DAT_TYPES.map(type => ({
    dat_type: type,
    mails: (mails || [])
      .filter(m => m.dat_type === type)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(m => ({
        ...m,
        users: checkExpired(
          (users || [])
            .filter(u => u.mail_id === m.id)
            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
            .map(u => ({ ...u, history: [] }))
        )
      }))
  }));
}

// ── Fetch ──────────────────────────────────────────────────
export async function fetchDatData() {
  const [{ data: mails, error: mailErr }, { data: users, error: userErr }] = await Promise.all([
    supabase.from('dat_mails').select('*'),
    supabase.from('dat_users').select('*')
  ]);
  if (mailErr) throw mailErr;
  if (userErr) throw userErr;
  return buildNestedStructure(mails, users);
}

export async function fetchUserHistory(userId) {
  const { data, error } = await supabase
    .from('dat_user_history')
    .select('*')
    .eq('user_id', userId)
    .order('modified_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchBin() {
  const { data, error } = await supabase
    .from('recycle_bin')
    .select('*')
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── Mail CRUD ──────────────────────────────────────────────
export async function createMail(datType, mailName, screenName) {
  const { data, error } = await supabase
    .from('dat_mails')
    .insert({ dat_type: datType, mail_name: mailName, screen_name: screenName })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteMail(mailId) {
  // cascade deletes users too (FK constraint)
  const { error } = await supabase.from('dat_mails').delete().eq('id', mailId);
  if (error) throw error;
}

// ── User CRUD ──────────────────────────────────────────────
export async function createUser(mailId, fields) {
  const { data, error } = await supabase
    .from('dat_users')
    .insert({ mail_id: mailId, ...fields })
    .select().single();
  if (error) throw error;
  return { ...data, history: [] };
}

export async function updateUser(userId, prevSnapshot, updatedFields) {
  // 1. Log history entry
  await supabase.from('dat_user_history').insert({
    user_id: userId,
    price: prevSnapshot.price,
    status: prevSnapshot.status,
    start_date: prevSnapshot.start_date,
    end_date: prevSnapshot.end_date,
    action: 'Updated'
  });
  // 2. Apply update
  const { data, error } = await supabase
    .from('dat_users')
    .update(updatedFields)
    .eq('id', userId)
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateUserStatus(userId, status) {
  const { error } = await supabase.from('dat_users').update({ status }).eq('id', userId);
  if (error) throw error;
}

export async function softDeleteUser(userId, mailContext) {
  // 1. Fetch the user + their history
  const [{ data: user, error: uErr }, { data: history, error: hErr }] = await Promise.all([
    supabase.from('dat_users').select('*').eq('id', userId).single(),
    supabase.from('dat_user_history').select('*').eq('user_id', userId)
  ]);
  if (uErr) throw uErr;

  // 2. Insert into recycle_bin
  const { data: binRecord, error: bErr } = await supabase.from('recycle_bin').insert({
    client_name:        user.client_name,
    username:           user.username,
    price:              user.price,
    status:             user.status,
    start_date:         user.start_date,
    end_date:           user.end_date,
    original_dat_type:  mailContext.dat_type,
    original_mail_id:   mailContext.mail_id,
    original_mail_name: mailContext.screen_name,
    history:            history || []
  }).select().single();
  if (bErr) throw bErr;

  // 3. Hard-delete from dat_users (cascade removes history too)
  const { error: dErr } = await supabase.from('dat_users').delete().eq('id', userId);
  if (dErr) throw dErr;

  return binRecord;
}

export async function bulkInsertUsers(mailId, usersArray) {
  const rows = usersArray.map(u => ({ mail_id: mailId, ...u }));
  const { data, error } = await supabase.from('dat_users').insert(rows).select();
  if (error) throw error;
  return (data || []).map(u => ({ ...u, history: [] }));
}

// ── Bin ───────────────────────────────────────────────────
export async function restoreUser(binRecord) {
  // Re-insert into dat_users (use original_mail_id)
  const { data, error } = await supabase.from('dat_users').insert({
    mail_id:     binRecord.original_mail_id,
    client_name: binRecord.client_name,
    username:    binRecord.username,
    price:       binRecord.price,
    status:      binRecord.status,
    start_date:  binRecord.start_date,
    end_date:    binRecord.end_date
  }).select().single();
  if (error) throw error;

  // Re-insert history entries
  if (binRecord.history?.length) {
    await supabase.from('dat_user_history').insert(
      binRecord.history.map(h => ({ ...h, user_id: data.id, id: undefined }))
    );
  }

  // Remove from bin
  await supabase.from('recycle_bin').delete().eq('id', binRecord.id);
  return { ...data, history: binRecord.history || [] };
}

export async function permanentlyDelete(binId) {
  const { error } = await supabase.from('recycle_bin').delete().eq('id', binId);
  if (error) throw error;
}

export async function emptyBin() {
  const { error } = await supabase.from('recycle_bin').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}
