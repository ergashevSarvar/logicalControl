alter table if exists logical_controls
    add column if not exists basis varchar(2000);

alter table if exists logical_control_overviews
    add column if not exists basis varchar(2000);

update logical_control_overviews overview
set basis = control.basis
from logical_controls control
where overview.control_id = control.id
  and overview.basis is distinct from control.basis;
