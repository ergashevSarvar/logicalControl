alter table if exists logical_controls
    add column if not exists basis_file_name varchar(255),
    add column if not exists basis_file_content_type varchar(120),
    add column if not exists basis_file_size bigint,
    add column if not exists basis_file_data bytea;
