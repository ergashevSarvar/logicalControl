create table if not exists classifier_system_types (
    id uuid primary key,
    system_name varchar(120) not null,
    scope_type varchar(20) not null,
    flow_type varchar(20) not null,
    active boolean not null default true,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create unique index if not exists uq_classifier_system_types_name_lower
    on classifier_system_types (lower(system_name));
