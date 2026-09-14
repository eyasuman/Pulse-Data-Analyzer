alter table public.settings
  add column if not exists "globalTelebirrNumber" text,
  add column if not exists "globalTelebirrName" text,
  add column if not exists "globalCbeNumber" text,
  add column if not exists "globalCbeName" text;

comment on column public.settings."globalTelebirrNumber"
  is 'Platform fallback Telebirr merchant or account number.';
comment on column public.settings."globalTelebirrName"
  is 'Platform fallback Telebirr merchant or account name.';
comment on column public.settings."globalCbeNumber"
  is 'Platform fallback Commercial Bank of Ethiopia account number.';
comment on column public.settings."globalCbeName"
  is 'Platform fallback Commercial Bank of Ethiopia account name.';