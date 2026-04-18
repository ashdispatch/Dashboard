-- ============================================================
-- FIX: Drop old policies and replace with correct RLS rules
-- Run this in Supabase → SQL Editor → New Query
-- ============================================================

-- Drop old policies
drop policy if exists "Authenticated full access" on dat_mails;
drop policy if exists "Authenticated full access" on dat_users;
drop policy if exists "Authenticated full access" on dat_user_history;
drop policy if exists "Authenticated full access" on recycle_bin;
drop policy if exists "Authenticated full access" on dialers;

-- Re-create with correct syntax (using "to authenticated" role target)
create policy "Allow authenticated users"
  on dat_mails for all
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated users"
  on dat_users for all
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated users"
  on dat_user_history for all
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated users"
  on recycle_bin for all
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated users"
  on dialers for all
  to authenticated
  using (true)
  with check (true);
