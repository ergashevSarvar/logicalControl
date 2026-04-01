drop index if exists uq_classifier_system_types_name_lower;

alter table if exists classifier_system_types
    drop column if exists flow_type;

create unique index if not exists uq_classifier_system_types_name_scope_lower
    on classifier_system_types (lower(system_name), lower(scope_type));
