-- ============================================================
-- ASH DASHBOARD — Supabase PostgreSQL Schema
-- Run this entire file in Supabase → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension (already enabled by default in Supabase)
create extension if not exists "pgcrypto";

-- ============================================================
-- DAT MAILS — Mail groups under each DAT type
-- ============================================================
create table if not exists dat_mails (
  id           uuid primary key default gen_random_uuid(),
  dat_type     text not null check (dat_type in ('Single Search', 'Double Search', 'Unlimited Search')),
  mail_name    text not null,
  screen_name  text not null,
  created_at   timestamptz default now()
);

-- ============================================================
-- DAT USERS — Users assigned to a mail group
-- ============================================================
create table if not exists dat_users (
  id           uuid primary key default gen_random_uuid(),
  mail_id      uuid references dat_mails(id) on delete cascade,
  client_name  text not null,
  username     text,
  price        numeric(10,2) default 0,
  status       text not null default 'Paid' check (status in ('Paid', 'Unpaid')),
  start_date   timestamptz not null,
  end_date     timestamptz not null,
  created_at   timestamptz default now()
);

-- ============================================================
-- DAT USER HISTORY — Edit log (captured on every update)
-- ============================================================
create table if not exists dat_user_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references dat_users(id) on delete cascade,
  price        numeric(10,2),
  status       text,
  start_date   timestamptz,
  end_date     timestamptz,
  action       text default 'Updated',
  modified_at  timestamptz default now()
);

-- ============================================================
-- RECYCLE BIN — Soft-deleted DAT users
-- ============================================================
create table if not exists recycle_bin (
  id                  uuid primary key default gen_random_uuid(),
  client_name         text not null,
  username            text,
  price               numeric(10,2) default 0,
  status              text default 'Paid',
  start_date          timestamptz,
  end_date            timestamptz,
  deleted_at          timestamptz default now(),
  original_dat_type   text,
  original_mail_id    uuid,
  original_mail_name  text,
  history             jsonb default '[]'
);

-- ============================================================
-- DIALERS — Dialer accounts (flat list)
-- ============================================================
create table if not exists dialers (
  id           uuid primary key default gen_random_uuid(),
  client_name  text not null,
  dialer_type  text not null default 'Zoom' check (dialer_type in ('Zoom', 'Google Voice', 'Teams', 'Other')),
  dialer_mail  text not null,
  price        numeric(10,2) default 0,
  status       text not null default 'Paid' check (status in ('Paid', 'Unpaid')),
  start_date   timestamptz not null,
  end_date     timestamptz not null,
  created_at   timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY — Only authenticated users can access data
-- ============================================================
alter table dat_mails        enable row level security;
alter table dat_users        enable row level security;
alter table dat_user_history enable row level security;
alter table recycle_bin      enable row level security;
alter table dialers          enable row level security;

-- Policies: Allow all operations for authenticated users only
create policy "Authenticated full access" on dat_mails        for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on dat_users        for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on dat_user_history for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on recycle_bin      for all using (auth.role() = 'authenticated');
create policy "Authenticated full access" on dialers          for all using (auth.role() = 'authenticated');
