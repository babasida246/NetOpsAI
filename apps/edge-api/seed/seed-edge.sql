INSERT INTO edge_connectors
    (name, config)
VALUES
    ('ssh', '{}'
::jsonb),
('snmp', '{}'::jsonb),
('zabbix', '{}'::jsonb),
('syslog', '{}'::jsonb)
ON CONFLICT
(name) DO NOTHING;
