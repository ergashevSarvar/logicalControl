create table if not exists logical_control_number_sequences (
    sequence_year integer primary key,
    last_value integer not null
);

create table if not exists logical_control_overviews (
    control_id uuid primary key references logical_controls(id) on delete cascade,
    unique_number varchar(60) not null unique,
    name varchar(200) not null,
    objective varchar(2000),
    basis_file_name varchar(255),
    basis_file_content_type varchar(120),
    basis_file_size bigint,
    basis_file_data bytea,
    system_name varchar(160) not null,
    start_date date,
    finish_date date,
    control_type varchar(20) not null,
    process_stage varchar(120) not null,
    sms_notification_enabled boolean not null default false,
    sms_phones jsonb not null default '[]'::jsonb,
    deployment_scope varchar(20) not null,
    direction_type varchar(20),
    confidentiality_level varchar(60),
    created_at timestamptz not null,
    updated_at timestamptz not null
);

insert into logical_control_overviews (
    control_id,
    unique_number,
    name,
    objective,
    basis_file_name,
    basis_file_content_type,
    basis_file_size,
    basis_file_data,
    system_name,
    start_date,
    finish_date,
    control_type,
    process_stage,
    sms_notification_enabled,
    sms_phones,
    deployment_scope,
    direction_type,
    confidentiality_level,
    created_at,
    updated_at
)
select
    id,
    unique_number,
    name,
    objective,
    basis_file_name,
    basis_file_content_type,
    basis_file_size,
    basis_file_data,
    system_name,
    start_date,
    finish_date,
    control_type,
    process_stage,
    sms_notification_enabled,
    sms_phones,
    deployment_scope,
    direction_type,
    confidentiality_level,
    created_at,
    updated_at
from logical_controls
on conflict (control_id) do nothing;

insert into logical_control_number_sequences (sequence_year, last_value)
select
    substring(unique_number from 3 for 4)::integer as sequence_year,
    max(substring(unique_number from 7 for 7)::integer) as last_value
from logical_controls
where unique_number ~ '^LC[0-9]{4}[0-9]{7}$'
group by substring(unique_number from 3 for 4)
on conflict (sequence_year) do update
set last_value = excluded.last_value;
