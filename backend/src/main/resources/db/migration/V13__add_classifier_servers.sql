create table if not exists classifier_servers (
    id uuid primary key,
    name varchar(220) not null,
    description varchar(1200),
    active boolean not null default true,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create unique index if not exists uq_classifier_servers_name_lower
    on classifier_servers (lower(name));

insert into classifier_servers (id, name, description, active, created_at, updated_at)
values
    (gen_random_uuid(), 'etran.db.gtk', 'ETRAN serveri', true, now(), now()),
    (gen_random_uuid(), 'dbtest.db.gtk', 'Test serveri', true, now(), now()),
    (gen_random_uuid(), 'mat.db.gtk', 'MAT serveri', true, now(), now()),
    (gen_random_uuid(), 'ed1.db.gtk', 'ED1 serveri', true, now(), now()),
    (gen_random_uuid(), 'arxiv.db.gtk', 'Arxiv serveri', true, now(), now()),
    (gen_random_uuid(), 'ebr02.db.gtk', 'EBR02 serveri', true, now(), now()),
    (gen_random_uuid(), 'ebr01.db.gtk', 'EBR01 serveri', true, now(), now()),
    (gen_random_uuid(), 'Dc1paym01.db.gtk', 'DC1 payment serveri', true, now(), now())
on conflict do nothing;
