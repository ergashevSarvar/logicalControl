create table if not exists classifier_departments (
    id uuid primary key,
    name varchar(220) not null,
    department_type varchar(40) not null,
    active boolean not null default true,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table if not exists classifier_process_stages (
    id uuid primary key,
    name varchar(180) not null,
    description varchar(1200),
    sort_order integer not null,
    active boolean not null default true,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create unique index if not exists uq_classifier_departments_name_lower
    on classifier_departments (lower(name));

create unique index if not exists uq_classifier_process_stages_name_lower
    on classifier_process_stages (lower(name));

create unique index if not exists uq_classifier_process_stages_sort_order
    on classifier_process_stages (sort_order);
