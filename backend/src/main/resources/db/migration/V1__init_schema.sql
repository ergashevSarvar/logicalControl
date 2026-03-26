create table if not exists roles (
    id uuid primary key,
    code varchar(50) not null unique,
    name varchar(100) not null,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table if not exists app_users (
    id uuid primary key,
    username varchar(60) not null unique,
    full_name varchar(140) not null,
    password_hash varchar(120) not null,
    locale varchar(16) not null,
    enabled boolean not null,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table if not exists user_roles (
    user_id uuid not null references app_users(id) on delete cascade,
    role_id uuid not null references roles(id) on delete cascade,
    primary key (user_id, role_id)
);

create table if not exists logical_controls (
    id uuid primary key,
    code varchar(40) not null unique,
    name varchar(200) not null,
    objective varchar(2000),
    system_name varchar(10) not null,
    approvers jsonb not null default '[]'::jsonb,
    start_date date,
    finish_date date,
    unique_number varchar(60) not null unique,
    control_type varchar(20) not null,
    process_stage varchar(120) not null,
    author_name varchar(140) not null,
    responsible_department varchar(160) not null,
    status varchar(20) not null,
    suspended_until timestamp,
    messages jsonb not null default '{}'::jsonb,
    phone_extension varchar(40),
    priority_order integer,
    confidentiality_level varchar(60),
    sms_notification_enabled boolean not null default false,
    sms_phones jsonb not null default '[]'::jsonb,
    deployment_scope varchar(20) not null,
    version_number integer not null default 1,
    timeout_ms integer,
    last_execution_duration_ms bigint,
    territories jsonb not null default '[]'::jsonb,
    posts jsonb not null default '[]'::jsonb,
    auto_cancel_after_days integer,
    conflict_monitoring_enabled boolean not null default true,
    copied_from_control_id uuid,
    rule_builder_canvas jsonb not null default '{}'::jsonb,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table if not exists logical_rules (
    id uuid primary key,
    control_id uuid not null references logical_controls(id) on delete cascade,
    name varchar(140) not null,
    description varchar(1000),
    sort_order integer not null default 0,
    active boolean not null default true,
    rule_type varchar(20) not null,
    definition jsonb not null default '{}'::jsonb,
    visual jsonb not null default '{}'::jsonb,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table if not exists execution_logs (
    id uuid primary key,
    control_id uuid not null references logical_controls(id) on delete cascade,
    instime timestamptz not null,
    result varchar(20) not null,
    declaration_id varchar(80),
    declaration_uncod_id varchar(80),
    duration_ms bigint,
    matched_rule_name varchar(140),
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table if not exists change_logs (
    id uuid primary key,
    control_id uuid not null references logical_controls(id) on delete cascade,
    actor varchar(140) not null,
    action varchar(40) not null,
    changed_at timestamptz not null,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table if not exists dictionary_entries (
    id uuid primary key,
    category varchar(60) not null,
    code varchar(80) not null,
    labels jsonb not null default '{}'::jsonb,
    active boolean not null default true,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create table if not exists exception_entries (
    id uuid primary key,
    exception_type varchar(80) not null,
    subject_key varchar(120) not null,
    description varchar(500),
    valid_from date,
    valid_to date,
    active boolean not null default true,
    created_at timestamptz not null,
    updated_at timestamptz not null
);

create index if not exists idx_logical_controls_status on logical_controls(status);
create index if not exists idx_logical_controls_system_name on logical_controls(system_name);
create index if not exists idx_execution_logs_instime on execution_logs(instime desc);
create index if not exists idx_execution_logs_control_id on execution_logs(control_id);
create index if not exists idx_change_logs_control_id on change_logs(control_id);
