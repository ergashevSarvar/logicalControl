alter table if exists classifier_process_stages
    add column if not exists sort_order integer not null default 0;

update logical_controls
set process_stage = case process_stage
    when 'VERIFICATION' then 'Verifikatsiyadan o''tkazish'
    when 'ACCEPTANCE' then 'Qabul qilish'
    when 'CLEARANCE' then 'Ma''lumot kiritish'
    when 'DISPATCH' then 'Jo''natish'
    when 'Dastlabki tekshiruvda qabul qilish' then 'Qabul qilish'
    when 'Rasmiylashtirish' then 'Ma''lumot kiritish'
    when 'Транспорт назорати' then 'Transport nazorati'
    when 'ИКМ назорати' then 'IKM nazorati'
    when 'Божхона кўздан кечируви' then 'Bojxona ko''zdan kechiruvi'
    when 'Кинолог текшируви' then 'Kinolog tekshiruvi'
    when 'Ветеринария назорати' then 'Veterinariya nazorati'
    when 'Фитосанитария назорати' then 'Fitosanitariya nazorati'
    else process_stage
end;
