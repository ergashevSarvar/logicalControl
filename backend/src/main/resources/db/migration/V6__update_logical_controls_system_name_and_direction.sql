alter table if exists logical_controls
    alter column system_name type varchar(160);

alter table if exists logical_controls
    add column if not exists direction_type varchar(20);

update logical_controls
set system_name = case system_name
    when 'AT' then 'Yukli avtotransport (AT)'
    when 'MB' then 'Yuksuz avtotransport (MB)'
    when 'RW' then 'Temir yo''l (RW)'
    when 'EK' then 'Eksport uch qadam (EK)'
    when 'TL' then 'Tolling (TL)'
    when 'EC' then 'Elektron tijorat (EC)'
    else system_name
end;

update logical_controls
set deployment_scope = 'INTERNAL'
where deployment_scope = 'HYBRID';

update logical_controls
set direction_type = 'ENTRY'
where deployment_scope = 'INTERNAL'
  and direction_type is null;
