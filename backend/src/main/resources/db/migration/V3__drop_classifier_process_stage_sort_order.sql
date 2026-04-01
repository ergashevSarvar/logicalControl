drop index if exists uq_classifier_process_stages_sort_order;

alter table if exists classifier_process_stages
    drop column if exists sort_order;
