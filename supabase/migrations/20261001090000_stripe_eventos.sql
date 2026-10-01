-- Idempotencia del webhook de Stripe: Stripe reintenta entregas y puede
-- duplicarlas. Cada event.id se registra una vez; un duplicado viola la PK y se
-- ignora. Si el procesamiento falla, la ruta borra la fila para que el
-- reintento de Stripe vuelva a procesarlo.
create table if not exists public.stripe_eventos (
  id text primary key,
  tipo text not null,
  procesado_en timestamptz not null default now()
);

alter table public.stripe_eventos enable row level security;
alter table public.stripe_eventos force row level security;

drop policy if exists sin_acceso_publico on public.stripe_eventos;
create policy sin_acceso_publico on public.stripe_eventos
  using (false) with check (false);

revoke all on public.stripe_eventos from anon, authenticated;
