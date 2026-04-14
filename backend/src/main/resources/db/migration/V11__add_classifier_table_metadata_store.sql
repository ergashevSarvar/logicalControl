create table if not exists entity_column_metadata (
    entity_name text not null,
    entity_name_definition text not null,
    column_name text not null,
    column_name_definition text not null,
    column_type text,
    column_length text
);

create table if not exists classifier_tables (
    id uuid primary key,
    table_name text not null,
    entity_name_definition text,
    description text not null,
    system_type varchar(120) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists uq_classifier_tables_table_name_lower
    on classifier_tables (lower(table_name));

create table if not exists classifier_table_columns (
    id uuid primary key,
    classifier_table_id uuid not null references classifier_tables(id) on delete cascade,
    column_name text not null,
    column_name_definition text,
    column_type text,
    column_length text,
    data_type text not null,
    column_description text,
    nullable boolean,
    ordinal_position integer not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists uq_classifier_table_columns_table_column_lower
    on classifier_table_columns (classifier_table_id, lower(column_name));

create index if not exists idx_classifier_table_columns_table_order
    on classifier_table_columns (classifier_table_id, ordinal_position);
