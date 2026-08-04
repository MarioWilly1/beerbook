-- Tabla de noticias cargadas manualmente desde el AdminPanel, mostradas en la
-- pestaña "Noticias" de La Taberna. category distingue novedades generales del
-- mundo cervecero de novedades de las redes sociales propias.
create table public.news (
  id            bigint generated always as identity primary key,
  title         text not null,
  body          text not null,
  link_url      text,
  category      text not null default 'general' check (category in ('general', 'redes')),
  published_at  date not null default current_date,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.news enable row level security;

create policy "news_read" on public.news
  for select to authenticated using (true);

create policy "news_admin_insert" on public.news
  for insert to authenticated with check (is_admin());

create policy "news_admin_update" on public.news
  for update to authenticated using (is_admin()) with check (is_admin());

create policy "news_admin_delete" on public.news
  for delete to authenticated using (is_admin());
