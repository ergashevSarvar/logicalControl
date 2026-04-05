delete from logical_control_overviews
where control_id in (
    select id
    from logical_controls
    where code in ('MN-AT-001', 'MN-EK-002', 'MN-RW-003', 'MN-EC-004')
);

delete from logical_controls
where code in ('MN-AT-001', 'MN-EK-002', 'MN-RW-003', 'MN-EC-004');
