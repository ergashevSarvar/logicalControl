alter table if exists logical_controls
    add column if not exists table_name varchar(255);

alter table if exists logical_control_overviews
    add column if not exists table_name varchar(255);

update logical_control_overviews overview
set table_name = control.table_name
from logical_controls control
where overview.control_id = control.id
  and overview.table_name is distinct from control.table_name;
