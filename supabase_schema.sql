-- ============================================================
-- MinaApp — Schema Supabase (ejecutar en SQL Editor de Supabase)
-- ============================================================

-- USUARIOS (extendido de auth.users)
create table if not exists usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text not null,
  rol text not null check (rol in ('administrador','ministro')),
  activo boolean default true,
  created_at timestamptz default now()
);

-- CORTES QUINCENALES
create table if not exists cortes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  precio_carbon_ton numeric not null,
  precio_flete_ton numeric not null,
  estado text not null default 'abierto' check (estado in ('abierto','cerrado','archivado')),
  creado_por uuid references usuarios(id),
  created_at timestamptz default now()
);

-- TARIFAS CONFIGURABLES
create table if not exists tarifas (
  id uuid primary key default gen_random_uuid(),
  concepto text not null,
  valor numeric not null,
  unidad text not null,
  vigente_desde timestamptz default now(),
  created_at timestamptz default now()
);

-- PERSONAL OPERATIVO
create table if not exists personal_operativo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cargo text not null,
  valor_quincenal numeric not null,
  activo boolean default true,
  observaciones text,
  created_at timestamptz default now()
);

-- REGISTRO PICADORES
create table if not exists picadores_registros (
  id uuid primary key default gen_random_uuid(),
  corte_id uuid references cortes(id) on delete cascade,
  frente text not null check (frente in ('frente1','frente2','frente3')),
  par_numero int not null default 1,
  fecha date not null,
  coches_grandes int not null default 0,
  coches_pequenos int not null default 0,
  kg_coche_grande numeric not null default 2250,
  kg_coche_pequeno numeric not null default 1500,
  valor_ton_grande numeric not null default 30000,
  valor_ton_pequeno numeric not null default 30000,
  created_by uuid references usuarios(id),
  created_at timestamptz default now()
);

-- TURNOS Y BONIFICACIONES (picadores / frenteros / ventilacion)
create table if not exists turnos_bonificaciones (
  id uuid primary key default gen_random_uuid(),
  corte_id uuid references cortes(id) on delete cascade,
  modulo text not null check (modulo in ('picadores','frenteros','ventilacion')),
  frente text check (frente in ('frente1','frente2','frente3')),
  tipo text not null check (tipo in ('turno','bonificacion','varios')),
  descripcion text,
  cantidad numeric default 1,
  valor_unitario numeric default 0,
  valor_total numeric not null,
  created_by uuid references usuarios(id),
  created_at timestamptz default now()
);

-- REGISTRO FRENTEROS
create table if not exists frenteros_registros (
  id uuid primary key default gen_random_uuid(),
  corte_id uuid references cortes(id) on delete cascade,
  frente text not null check (frente in ('frente1','frente2','frente3')),
  fecha date not null,
  metros_avanzados numeric not null default 0,
  valor_metro numeric not null default 350000,
  patios_hechos int not null default 0,
  valor_patio numeric not null default 950000,
  created_by uuid references usuarios(id),
  created_at timestamptz default now()
);

-- REGISTRO VENTILACIÓN
create table if not exists ventilacion_registros (
  id uuid primary key default gen_random_uuid(),
  corte_id uuid references cortes(id) on delete cascade,
  frente text not null check (frente in ('frente1','frente2','frente3')),
  fecha date not null,
  metros_avanzados numeric not null default 0,
  metros_por_tramo numeric not null default 16,
  valor_por_tramo numeric not null default 120000,
  created_by uuid references usuarios(id),
  created_at timestamptz default now()
);

-- REGISTRO COCHEROS
create table if not exists cocheros_registros (
  id uuid primary key default gen_random_uuid(),
  corte_id uuid references cortes(id) on delete cascade,
  frente text not null check (frente in ('frente1','frente2','frente3')),
  fecha date not null,
  coches_sacados int not null default 0,
  valor_por_coche numeric not null default 16000,
  created_by uuid references usuarios(id),
  created_at timestamptz default now()
);

-- NÓMINA PERSONAL OPERATIVO POR CORTE
create table if not exists nomina_operativo_corte (
  id uuid primary key default gen_random_uuid(),
  corte_id uuid references cortes(id) on delete cascade,
  personal_id uuid references personal_operativo(id),
  valor_pagado numeric not null,
  observaciones text,
  created_at timestamptz default now(),
  unique(corte_id, personal_id)
);

-- GASTOS OPERATIVOS
create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  corte_id uuid references cortes(id) on delete cascade,
  categoria text not null,
  descripcion text,
  cantidad numeric,
  valor_unitario numeric,
  monto_total numeric not null,
  tipo text not null default 'operativo' check (tipo in ('operativo','no_operativo')),
  fecha date,
  created_by uuid references usuarios(id),
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table usuarios enable row level security;
alter table cortes enable row level security;
alter table tarifas enable row level security;
alter table personal_operativo enable row level security;
alter table picadores_registros enable row level security;
alter table turnos_bonificaciones enable row level security;
alter table frenteros_registros enable row level security;
alter table ventilacion_registros enable row level security;
alter table cocheros_registros enable row level security;
alter table nomina_operativo_corte enable row level security;
alter table gastos enable row level security;

-- Políticas: usuarios autenticados leen todo; solo admin puede modificar datos críticos
create policy "Authenticated read all" on usuarios for select using (auth.uid() is not null);
create policy "Authenticated read cortes" on cortes for select using (auth.uid() is not null);
create policy "Authenticated insert cortes" on cortes for insert with check (auth.uid() is not null);
create policy "Authenticated update cortes" on cortes for update using (auth.uid() is not null);
create policy "Authenticated all tarifas" on tarifas for all using (auth.uid() is not null);
create policy "Authenticated all personal" on personal_operativo for all using (auth.uid() is not null);
create policy "Authenticated all picadores" on picadores_registros for all using (auth.uid() is not null);
create policy "Authenticated all turnos" on turnos_bonificaciones for all using (auth.uid() is not null);
create policy "Authenticated all frenteros" on frenteros_registros for all using (auth.uid() is not null);
create policy "Authenticated all ventilacion" on ventilacion_registros for all using (auth.uid() is not null);
create policy "Authenticated all cocheros" on cocheros_registros for all using (auth.uid() is not null);
create policy "Authenticated all nomina" on nomina_operativo_corte for all using (auth.uid() is not null);
create policy "Authenticated all gastos" on gastos for all using (auth.uid() is not null);

-- ============================================================
-- FUNCIÓN: crear usuario en tabla usuarios al registrarse
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.usuarios (id, email, nombre, rol)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)), coalesce(new.raw_user_meta_data->>'rol','ministro'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
