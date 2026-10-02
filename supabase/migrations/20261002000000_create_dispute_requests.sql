create table if not exists public.dispute_requests (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  reason text not null check (char_length(btrim(reason)) between 10 and 500),
  contact text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewed')),
  created_at timestamptz not null default now()
);

alter table public.dispute_requests enable row level security;

drop policy if exists "Allow public dispute requests" on public.dispute_requests;
create policy "Allow public dispute requests"
on public.dispute_requests
for insert
to anon, authenticated
with check (status = 'pending');

grant insert on table public.dispute_requests to anon, authenticated;