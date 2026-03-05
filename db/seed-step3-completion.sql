-- Step 3 completion seed for governance/audit/workflow gaps
\set ON_ERROR_STOP on
BEGIN;

INSERT INTO app_meta (key,value) VALUES
  ('seed.step3.last_run',jsonb_build_object('seed','step3_completion','at',to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SSOF'))),
  ('seed.step3.scope','{"focus":["audit","workflow","reporting","printing","alerts","rbac_legacy"]}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW();

INSERT INTO roles (id,slug,name,description,is_system) VALUES
  ('99610000-0000-0000-0000-000000000001','ops_auditor','Operations Auditor','Can review audits, depreciation, and governance reports',false),
  ('99610000-0000-0000-0000-000000000002','procurement_manager','Procurement Manager','Can approve procurement workflows and execute sourcing reports',false)
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name,description=EXCLUDED.description,is_system=EXCLUDED.is_system,updated_at=NOW();

INSERT INTO permissions (id,name,resource,action,description) VALUES
  ('99611000-0000-0000-0000-000000000001','audit.sessions.read','audit_sessions','read','View audit session lifecycle and findings'),
  ('99611000-0000-0000-0000-000000000002','audit.sessions.approve','audit_sessions','approve','Approve audit closure and corrective actions'),
  ('99611000-0000-0000-0000-000000000003','reports.financial.execute','reports','execute','Run depreciation and financial compliance reports'),
  ('99611000-0000-0000-0000-000000000004','workflow.procurement.approve','wf_requests','approve','Approve procurement workflow requests')
ON CONFLICT (name) DO UPDATE SET
  resource=EXCLUDED.resource,action=EXCLUDED.action,description=EXCLUDED.description;

INSERT INTO role_permissions (role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON r.slug='ops_auditor' AND p.name IN ('audit.sessions.read','reports.financial.execute')
UNION ALL
SELECT r.id,p.id FROM roles r JOIN permissions p ON r.slug='procurement_manager' AND p.name IN ('audit.sessions.read','workflow.procurement.approve')
ON CONFLICT (role_id,permission_id) DO NOTHING;

INSERT INTO org_units (id,name,parent_id,path,depth,description) VALUES
  ('99612000-0000-0000-0000-000000000001','Corporate IT',NULL::uuid,'/corporate-it',0,'Top-level IT organization unit'),
  ('99612000-0000-0000-0000-000000000002','Network Operations Center','99612000-0000-0000-0000-000000000001'::uuid,'/corporate-it/noc',1,'24x7 monitoring and incident response team')
ON CONFLICT (path) DO UPDATE SET
  name=EXCLUDED.name,parent_id=EXCLUDED.parent_id,depth=EXCLUDED.depth,description=EXCLUDED.description,updated_at=NOW();

INSERT INTO rbac_users (id,username,display_name,email,ou_id,linked_user_id,status)
SELECT * FROM (
  SELECT
    '99613000-0000-0000-0000-000000000001'::uuid,'ops.manager'::varchar,'Ops Manager (Legacy RBAC)'::varchar,'ops.manager@netopsai.com'::varchar,
    ou.id,u.id,'active'::varchar
  FROM org_units ou JOIN users u ON u.email='ops.manager@netopsai.com' WHERE ou.path='/corporate-it/noc'
  UNION ALL
  SELECT
    '99613000-0000-0000-0000-000000000002'::uuid,'cmdb.owner'::varchar,'CMDB Owner (Legacy RBAC)'::varchar,'cmdb.owner@netopsai.com'::varchar,
    ou.id,u.id,'active'::varchar
  FROM org_units ou JOIN users u ON u.email='cmdb.owner@netopsai.com' WHERE ou.path='/corporate-it/noc'
) x(id,username,display_name,email,ou_id,linked_user_id,status)
ON CONFLICT (username) DO UPDATE SET
  display_name=EXCLUDED.display_name,email=EXCLUDED.email,ou_id=EXCLUDED.ou_id,linked_user_id=EXCLUDED.linked_user_id,status=EXCLUDED.status,updated_at=NOW();

INSERT INTO rbac_groups (id,name,description,ou_id)
SELECT '99614000-0000-0000-0000-000000000001'::uuid,'NOC Duty Officers'::varchar,'Primary operator group for incident and change triage'::text,ou.id
FROM org_units ou WHERE ou.path='/corporate-it/noc'
ON CONFLICT (ou_id,name) DO UPDATE SET
  description=EXCLUDED.description,updated_at=NOW();

INSERT INTO rbac_group_members (id,group_id,member_type,member_user_id)
SELECT * FROM (
  SELECT '99614100-0000-0000-0000-000000000001'::uuid,g.id,'USER'::varchar,u.id
  FROM rbac_groups g JOIN rbac_users u ON u.username='ops.manager'
  WHERE g.name='NOC Duty Officers'
  UNION ALL
  SELECT '99614100-0000-0000-0000-000000000002'::uuid,g.id,'USER'::varchar,u.id
  FROM rbac_groups g JOIN rbac_users u ON u.username='cmdb.owner'
  WHERE g.name='NOC Duty Officers'
) x(id,group_id,member_type,member_user_id)
ON CONFLICT (group_id,member_user_id) DO UPDATE SET member_type=EXCLUDED.member_type;

INSERT INTO rbac_ad_permissions (id,key,description) VALUES
  ('99615000-0000-0000-0000-000000000001','wf.approval.decide','Decide approve/reject on workflow approval tasks'),
  ('99615000-0000-0000-0000-000000000002','report.execute','Execute built-in and custom reports')
ON CONFLICT (key) DO UPDATE SET description=EXCLUDED.description;

INSERT INTO rbac_role_ad_permissions (role_id,permission_id)
SELECT rr.id,p.id
FROM rbac_roles rr JOIN rbac_ad_permissions p ON p.key='wf.approval.decide'
WHERE rr.key IN ('admin','it_asset_manager')
UNION ALL
SELECT rr.id,p.id
FROM rbac_roles rr JOIN rbac_ad_permissions p ON p.key='report.execute'
WHERE rr.key IN ('admin','technician')
ON CONFLICT (role_id,permission_id) DO NOTHING;

INSERT INTO rbac_acl (id,principal_type,principal_group_id,role_id,scope_type,scope_ou_id,effect,inherit,created_by)
SELECT
  '99616000-0000-0000-0000-000000000001'::uuid,'GROUP'::varchar,g.id,rr.id,'OU'::varchar,ou.id,'ALLOW'::varchar,true,
  (SELECT id FROM users WHERE email='admin@example.com' LIMIT 1)
FROM rbac_groups g
JOIN org_units ou ON ou.id=g.ou_id AND ou.path='/corporate-it/noc'
JOIN rbac_roles rr ON rr.key='it_asset_manager'
WHERE g.name='NOC Duty Officers'
ON CONFLICT (id) DO UPDATE SET
  principal_type=EXCLUDED.principal_type,principal_group_id=EXCLUDED.principal_group_id,role_id=EXCLUDED.role_id,
  scope_type=EXCLUDED.scope_type,scope_ou_id=EXCLUDED.scope_ou_id,effect=EXCLUDED.effect,inherit=EXCLUDED.inherit,
  created_by=EXCLUDED.created_by,updated_at=NOW();

INSERT INTO asset_status_catalogs (id,name,code,is_terminal,color) VALUES
  ('99620000-0000-0000-0000-000000000001','In Use','in_use',false,'#16a34a'),
  ('99620000-0000-0000-0000-000000000002','In Storage','in_storage',false,'#0ea5e9'),
  ('99620000-0000-0000-0000-000000000003','Under Repair','under_repair',false,'#f59e0b'),
  ('99620000-0000-0000-0000-000000000004','Disposed','disposed',true,'#6b7280')
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name,code=EXCLUDED.code,is_terminal=EXCLUDED.is_terminal,color=EXCLUDED.color,updated_at=NOW();

INSERT INTO asset_checkouts (id,checkout_code,asset_id,checkout_type,target_user_id,checkout_date,expected_checkin_date,checked_out_by,checkout_notes,checkin_date,checked_in_by,checkin_notes,status,organization_id)
SELECT * FROM (
  SELECT
    '99621000-0000-0000-0000-000000000001'::uuid,'CO-2026-0001'::varchar,a.id,'user'::varchar,u_target.id,
    NOW()-INTERVAL '18 days',CURRENT_DATE-2,u_actor.id,'Laptop issued for remote incident bridge support'::text,
    NOW()-INTERVAL '2 days',u_actor.id,'Device returned and re-imaged for reassignment'::text,'checked_in'::varchar,o.id
  FROM assets a
  JOIN users u_target ON u_target.email='ops.manager@netopsai.com'
  JOIN users u_actor ON u_actor.email='admin@example.com'
  JOIN organizations o ON o.name='NetOpsAI Operations'
  WHERE a.asset_code='AST-LAP-0002'
  UNION ALL
  SELECT
    '99621000-0000-0000-0000-000000000002'::uuid,'CO-2026-0002'::varchar,a.id,'user'::varchar,u_target.id,
    NOW()-INTERVAL '1 day',CURRENT_DATE+14,u_actor.id,'Reassigned after return for CMDB reconciliation work'::text,
    NULL::timestamptz,NULL::uuid,NULL::text,'checked_out'::varchar,o.id
  FROM assets a
  JOIN users u_target ON u_target.email='cmdb.owner@netopsai.com'
  JOIN users u_actor ON u_actor.email='admin@example.com'
  JOIN organizations o ON o.name='NetOpsAI Operations'
  WHERE a.asset_code='AST-LAP-0002'
) x(id,checkout_code,asset_id,checkout_type,target_user_id,checkout_date,expected_checkin_date,checked_out_by,checkout_notes,checkin_date,checked_in_by,checkin_notes,status,organization_id)
ON CONFLICT (checkout_code) DO UPDATE SET
  asset_id=EXCLUDED.asset_id,checkout_type=EXCLUDED.checkout_type,target_user_id=EXCLUDED.target_user_id,
  checkout_date=EXCLUDED.checkout_date,expected_checkin_date=EXCLUDED.expected_checkin_date,checked_out_by=EXCLUDED.checked_out_by,
  checkout_notes=EXCLUDED.checkout_notes,checkin_date=EXCLUDED.checkin_date,checked_in_by=EXCLUDED.checked_in_by,
  checkin_notes=EXCLUDED.checkin_notes,status=EXCLUDED.status,organization_id=EXCLUDED.organization_id,updated_at=NOW();

INSERT INTO checkout_extensions (id,checkout_id,previous_expected_date,new_expected_date,extension_reason,extended_by,extended_at,notes)
SELECT
  '99621100-0000-0000-0000-000000000001'::uuid,c.id,CURRENT_DATE+14,CURRENT_DATE+21,
  'Need additional time for CMDB evidence collection during quarterly review'::text,
  (SELECT id FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1),NOW()-INTERVAL '2 hours',
  'Approved with service desk notification and SLA note attached'::text
FROM asset_checkouts c
WHERE c.checkout_code='CO-2026-0002'
ON CONFLICT (id) DO UPDATE SET
  checkout_id=EXCLUDED.checkout_id,previous_expected_date=EXCLUDED.previous_expected_date,new_expected_date=EXCLUDED.new_expected_date,
  extension_reason=EXCLUDED.extension_reason,extended_by=EXCLUDED.extended_by,extended_at=EXCLUDED.extended_at,notes=EXCLUDED.notes;

INSERT INTO checkout_audit_logs (id,checkout_id,asset_id,action,action_type,old_values,new_values,performed_by,performed_at,ip_address,user_agent,notes)
SELECT * FROM (
  SELECT
    '99621200-0000-0000-0000-000000000001'::uuid,c.id,c.asset_id,'checkout.created'::varchar,'checkout'::varchar,
    NULL::jsonb,'{"checkoutCode":"CO-2026-0002","target":"cmdb.owner@netopsai.com"}'::jsonb,
    (SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),NOW()-INTERVAL '1 day','10.10.10.15'::inet,
    'Mozilla/5.0'::text,'Asset checkout created for CMDB reconciliation assignment'::text
  FROM asset_checkouts c WHERE c.checkout_code='CO-2026-0002'
  UNION ALL
  SELECT
    '99621200-0000-0000-0000-000000000002'::uuid,c.id,c.asset_id,'checkout.extended'::varchar,'extension'::varchar,
    ('{"expectedCheckin":"'||(CURRENT_DATE+14)::text||'"}')::jsonb,('{"expectedCheckin":"'||(CURRENT_DATE+21)::text||'"}')::jsonb,
    (SELECT id FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1),NOW()-INTERVAL '2 hours','10.10.10.15'::inet,
    'Mozilla/5.0'::text,'Extension approved to complete evidence package'::text
  FROM asset_checkouts c WHERE c.checkout_code='CO-2026-0002'
) x(id,checkout_id,asset_id,action,action_type,old_values,new_values,performed_by,performed_at,ip_address,user_agent,notes)
ON CONFLICT (id) DO UPDATE SET
  checkout_id=EXCLUDED.checkout_id,asset_id=EXCLUDED.asset_id,action=EXCLUDED.action,action_type=EXCLUDED.action_type,
  old_values=EXCLUDED.old_values,new_values=EXCLUDED.new_values,performed_by=EXCLUDED.performed_by,performed_at=EXCLUDED.performed_at,
  ip_address=EXCLUDED.ip_address,user_agent=EXCLUDED.user_agent,notes=EXCLUDED.notes;

INSERT INTO checkout_transfers (id,original_checkout_id,new_checkout_id,from_user_id,to_user_id,transfer_reason,transferred_by,transferred_at,notes)
SELECT
  '99621300-0000-0000-0000-000000000001'::uuid,co_old.id,co_new.id,u_from.id,u_to.id,
  'Handover from operations to CMDB owner for inventory evidence reconciliation'::text,
  (SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),NOW()-INTERVAL '1 day',
  'Transfer logged after return and reassignment approval'::text
FROM asset_checkouts co_old
JOIN asset_checkouts co_new ON co_old.checkout_code='CO-2026-0001' AND co_new.checkout_code='CO-2026-0002'
JOIN users u_from ON u_from.email='ops.manager@netopsai.com'
JOIN users u_to ON u_to.email='cmdb.owner@netopsai.com'
ON CONFLICT (id) DO UPDATE SET
  original_checkout_id=EXCLUDED.original_checkout_id,new_checkout_id=EXCLUDED.new_checkout_id,
  from_user_id=EXCLUDED.from_user_id,to_user_id=EXCLUDED.to_user_id,transfer_reason=EXCLUDED.transfer_reason,
  transferred_by=EXCLUDED.transferred_by,transferred_at=EXCLUDED.transferred_at,notes=EXCLUDED.notes;

INSERT INTO asset_attachments (id,asset_id,file_name,mime_type,storage_key,size_bytes,version,uploaded_by,correlation_id)
SELECT
  '99622000-0000-0000-0000-000000000001'::uuid,a.id,
  'srv-auth-01-maintenance-report.pdf'::text,'application/pdf'::text,'assets/AST-SRV-0001/maintenance-report-2026Q1.pdf'::text,
  248576,1,'admin@example.com'::text,'maint-2026-q1'::text
FROM assets a
WHERE a.asset_code='AST-SRV-0001'
ON CONFLICT (id) DO UPDATE SET
  asset_id=EXCLUDED.asset_id,file_name=EXCLUDED.file_name,mime_type=EXCLUDED.mime_type,storage_key=EXCLUDED.storage_key,
  size_bytes=EXCLUDED.size_bytes,version=EXCLUDED.version,uploaded_by=EXCLUDED.uploaded_by,correlation_id=EXCLUDED.correlation_id;

INSERT INTO asset_consumption_logs (id,model_id,consumption_date,quantity,reason,ref_doc_type,ref_doc_id,note,created_by)
SELECT
  '99623000-0000-0000-0000-000000000001'::uuid,m.id,CURRENT_DATE-12,3,
  'Onboarding wave for new support engineers'::varchar,'stock_document'::varchar,NULL::uuid,
  'Three laptops consumed from ready stock for March onboarding batch'::text,'warehouse.lead'::varchar
FROM asset_models m
WHERE m.model='Latitude 7440'
ON CONFLICT (id) DO UPDATE SET
  model_id=EXCLUDED.model_id,consumption_date=EXCLUDED.consumption_date,quantity=EXCLUDED.quantity,
  reason=EXCLUDED.reason,ref_doc_type=EXCLUDED.ref_doc_type,ref_doc_id=EXCLUDED.ref_doc_id,note=EXCLUDED.note,created_by=EXCLUDED.created_by;

INSERT INTO attachments (id,entity_type,entity_id,file_name,mime_type,storage_key,size_bytes,version,uploaded_by,correlation_id)
SELECT * FROM (
  SELECT
    '99624000-0000-0000-0000-000000000001'::uuid,'repair_order'::text,r.id,
    'fw-edge-01-diagnostic.txt'::text,'text/plain'::text,'repair-orders/RO-2026-0001/diag.txt'::text,
    14870::bigint,1,'noc.user'::text,'RO-2026-0001'::text
  FROM repair_orders r WHERE r.code='RO-2026-0001'
  UNION ALL
  SELECT
    '99624000-0000-0000-0000-000000000002'::uuid,'stock_document'::text,d.id,
    'stock-invoice-SD-2026-0001.pdf'::text,'application/pdf'::text,'stock-docs/SD-2026-0001/invoice.pdf'::text,
    205334::bigint,1,'warehouse.lead'::text,'SD-2026-0001'::text
  FROM stock_documents d WHERE d.code='SD-2026-0001'
) x(id,entity_type,entity_id,file_name,mime_type,storage_key,size_bytes,version,uploaded_by,correlation_id)
ON CONFLICT (id) DO UPDATE SET
  entity_type=EXCLUDED.entity_type,entity_id=EXCLUDED.entity_id,file_name=EXCLUDED.file_name,mime_type=EXCLUDED.mime_type,
  storage_key=EXCLUDED.storage_key,size_bytes=EXCLUDED.size_bytes,version=EXCLUDED.version,uploaded_by=EXCLUDED.uploaded_by,correlation_id=EXCLUDED.correlation_id;

INSERT INTO cmdb_smart_tags (id,tag_name,tag_category,color,description,auto_assign_rules) VALUES
  ('99630000-0000-0000-0000-000000000001','internet-edge','auto','#ef4444','Assets and CIs exposed at network perimeter','[{"type":"ci_name_contains","value":"Edge"},{"type":"ci_type","value":"network_device"}]'::jsonb),
  ('99630000-0000-0000-0000-000000000002','erp-critical-path','manual','#f59e0b','Core ERP service chain components','[{"type":"service_code","value":"SVC-ERP-CORE"}]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  tag_name=EXCLUDED.tag_name,tag_category=EXCLUDED.tag_category,color=EXCLUDED.color,description=EXCLUDED.description,auto_assign_rules=EXCLUDED.auto_assign_rules;

INSERT INTO cmdb_impact_rules (id,name,source_ci_type_id,relationship_type_id,impact_level,propagation_depth,conditions,is_active)
SELECT
  '99631000-0000-0000-0000-000000000001'::uuid,
  'Edge firewall outage propagation to ERP stack'::varchar,
  ct.id,rt.id,'critical'::varchar,3,
  '{"environment":"prod","businessService":"ERP Core Service"}'::jsonb,true
FROM cmdb_ci_types ct
JOIN cmdb_relationship_types rt ON rt.code='protects'
WHERE ct.code='network_device'
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name,source_ci_type_id=EXCLUDED.source_ci_type_id,relationship_type_id=EXCLUDED.relationship_type_id,
  impact_level=EXCLUDED.impact_level,propagation_depth=EXCLUDED.propagation_depth,conditions=EXCLUDED.conditions,is_active=EXCLUDED.is_active;

INSERT INTO cmdb_changes (id,code,title,description,status,risk,primary_ci_id,impact_snapshot,implementation_plan,rollback_plan,planned_start_at,planned_end_at,requested_by,approved_by,metadata)
SELECT
  '99632000-0000-0000-0000-000000000001'::uuid,
  'CHG-2026-0042'::text,
  'Upgrade edge firewall firmware to close CVE window'::text,
  'Firmware uplift for HQ perimeter firewall with validation on ERP traffic paths'::text,
  'approved'::text,'high'::text,ci.id,
  '{"expectedImpact":"brief packet drops during failover test","services":["SVC-ERP-CORE"]}'::jsonb,
  'Backup config, upgrade standby, failover, upgrade active, run smoke tests'::text,
  'Restore previous firmware image and last known good config backup'::text,
  NOW()+INTERVAL '2 days',NOW()+INTERVAL '2 days 2 hours',
  'ops.manager@netopsai.com'::text,'security.lead@netopsai.com'::text,
  '{"changeWindow":"Sat 23:00 ICT","ticket":"SEC-2026-119"}'::jsonb
FROM cmdb_cis ci
WHERE ci.ci_code='CI-NET-FW-EDGE-01'
ON CONFLICT (code) DO UPDATE SET
  title=EXCLUDED.title,description=EXCLUDED.description,status=EXCLUDED.status,risk=EXCLUDED.risk,
  primary_ci_id=EXCLUDED.primary_ci_id,impact_snapshot=EXCLUDED.impact_snapshot,implementation_plan=EXCLUDED.implementation_plan,
  rollback_plan=EXCLUDED.rollback_plan,planned_start_at=EXCLUDED.planned_start_at,planned_end_at=EXCLUDED.planned_end_at,
  requested_by=EXCLUDED.requested_by,approved_by=EXCLUDED.approved_by,metadata=EXCLUDED.metadata,updated_at=NOW();

INSERT INTO cmdb_change_assessments (id,title,description,target_ci_ids,impact_analysis,risk_score,status,created_by,reviewed_by)
VALUES
(
  '99633000-0000-0000-0000-000000000001'::uuid,
  'Impact assessment for CHG-2026-0042',
  'Assess dependencies and blast radius before perimeter firewall firmware upgrade',
  ARRAY[
    (SELECT id FROM cmdb_cis WHERE ci_code='CI-NET-FW-EDGE-01' LIMIT 1),
    (SELECT id FROM cmdb_cis WHERE ci_code='CI-APP-ERP-01' LIMIT 1)
  ]::uuid[],
  '{"dependencyPaths":[["CI-NET-FW-EDGE-01","CI-APP-ERP-01"],["CI-NET-FW-EDGE-01","CI-DB-ERP-PRD"]],"riskDrivers":["single perimeter firewall","production window"]}'::jsonb,
  8.2,'reviewed','cmdb.owner@netopsai.com','security.lead@netopsai.com'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title,description=EXCLUDED.description,target_ci_ids=EXCLUDED.target_ci_ids,impact_analysis=EXCLUDED.impact_analysis,
  risk_score=EXCLUDED.risk_score,status=EXCLUDED.status,created_by=EXCLUDED.created_by,reviewed_by=EXCLUDED.reviewed_by,updated_at=NOW();

INSERT INTO cmdb_ci_tags (ci_id,tag_id,assigned_by,confidence)
SELECT ci.id,tag.id,'auto'::varchar,0.92
FROM cmdb_cis ci JOIN cmdb_smart_tags tag ON tag.tag_name='internet-edge'
WHERE ci.ci_code='CI-NET-FW-EDGE-01'
UNION ALL
SELECT ci.id,tag.id,'manual'::varchar,1.00
FROM cmdb_cis ci JOIN cmdb_smart_tags tag ON tag.tag_name='erp-critical-path'
WHERE ci.ci_code IN ('CI-APP-ERP-01','CI-DB-ERP-PRD')
ON CONFLICT (ci_id,tag_id) DO UPDATE SET assigned_by=EXCLUDED.assigned_by,confidence=EXCLUDED.confidence,created_at=NOW();

INSERT INTO ops_events (id,entity_type,entity_id,event_type,payload,actor_user_id,correlation_id)
SELECT
  '99634000-0000-0000-0000-000000000001'::uuid,
  'cmdb_change'::text,c.id,'change_submitted'::text,
  '{"code":"CHG-2026-0042","status":"approved","scope":"perimeter firmware"}'::jsonb,
  'ops.manager@netopsai.com'::text,'CHG-2026-0042'::text
FROM cmdb_changes c
WHERE c.code='CHG-2026-0042'
ON CONFLICT (id) DO UPDATE SET
  entity_type=EXCLUDED.entity_type,entity_id=EXCLUDED.entity_id,event_type=EXCLUDED.event_type,payload=EXCLUDED.payload,
  actor_user_id=EXCLUDED.actor_user_id,correlation_id=EXCLUDED.correlation_id;

INSERT INTO alert_rules (id,rule_code,name,description,rule_type,condition_field,condition_operator,condition_value,severity,channel,frequency,cooldown_hours,recipients,recipient_roles,is_builtin,is_active,organization_id,created_by,updated_by)
SELECT * FROM (
  SELECT
    '99640000-0000-0000-0000-000000000001'::uuid,'ALT-WARRANTY-30D'::varchar,'Warranty Expiry 30 Days'::varchar,
    'Notify asset owners when warranty has 30 days remaining'::text,'warranty'::varchar,'days_to_expiry'::varchar,'lte'::varchar,'30'::jsonb,
    'warning'::varchar,'both'::varchar,'daily'::varchar,24,'["ops.manager@netopsai.com","cmdb.owner@netopsai.com"]'::jsonb,
    '["it_asset_manager"]'::jsonb,true,true,o.id,u.id,u.id
  FROM organizations o JOIN users u ON u.email='admin@example.com'
  WHERE o.name='NetOpsAI Operations'
  UNION ALL
  SELECT
    '99640000-0000-0000-0000-000000000002'::uuid,'ALT-CHECKOUT-OVERDUE'::varchar,'Overdue Checkout Follow-up'::varchar,
    'Escalate when checkout exceeds expected return date'::text,'checkout'::varchar,'days_overdue'::varchar,'gte'::varchar,'2'::jsonb,
    'critical'::varchar,'in_app'::varchar,'once'::varchar,12,'["ops.manager@netopsai.com"]'::jsonb,
    '["technician","it_asset_manager"]'::jsonb,true,true,o.id,u.id,u.id
  FROM organizations o JOIN users u ON u.email='admin@example.com'
  WHERE o.name='NetOpsAI Operations'
) x(id,rule_code,name,description,rule_type,condition_field,condition_operator,condition_value,severity,channel,frequency,cooldown_hours,recipients,recipient_roles,is_builtin,is_active,organization_id,created_by,updated_by)
ON CONFLICT (rule_code) DO UPDATE SET
  name=EXCLUDED.name,description=EXCLUDED.description,rule_type=EXCLUDED.rule_type,condition_field=EXCLUDED.condition_field,
  condition_operator=EXCLUDED.condition_operator,condition_value=EXCLUDED.condition_value,severity=EXCLUDED.severity,channel=EXCLUDED.channel,
  frequency=EXCLUDED.frequency,cooldown_hours=EXCLUDED.cooldown_hours,recipients=EXCLUDED.recipients,recipient_roles=EXCLUDED.recipient_roles,
  is_builtin=EXCLUDED.is_builtin,is_active=EXCLUDED.is_active,organization_id=EXCLUDED.organization_id,created_by=EXCLUDED.created_by,
  updated_by=EXCLUDED.updated_by,updated_at=NOW();

INSERT INTO alert_history (id,rule_id,triggered_at,trigger_data,affected_count,title,message,severity,recipients_notified,channel_used,delivery_status,is_acknowledged,organization_id)
SELECT
  '99641000-0000-0000-0000-000000000001'::uuid,r.id,NOW()-INTERVAL '6 hours',
  '{"assetCode":"AST-LAP-0001","daysToExpiry":28}'::jsonb,1,
  'Warranty nearing expiry for AST-LAP-0001'::varchar,
  'Asset AST-LAP-0001 warranty will expire in 28 days. Plan renewal or replacement.'::text,
  'warning'::varchar,'["ops.manager@netopsai.com"]'::jsonb,'email'::varchar,'sent'::varchar,false,
  (SELECT id FROM organizations WHERE name='NetOpsAI Operations' LIMIT 1)
FROM alert_rules r
WHERE r.rule_code='ALT-WARRANTY-30D'
ON CONFLICT (id) DO UPDATE SET
  rule_id=EXCLUDED.rule_id,triggered_at=EXCLUDED.triggered_at,trigger_data=EXCLUDED.trigger_data,affected_count=EXCLUDED.affected_count,
  title=EXCLUDED.title,message=EXCLUDED.message,severity=EXCLUDED.severity,recipients_notified=EXCLUDED.recipients_notified,
  channel_used=EXCLUDED.channel_used,delivery_status=EXCLUDED.delivery_status,is_acknowledged=EXCLUDED.is_acknowledged,organization_id=EXCLUDED.organization_id;

INSERT INTO alert_dedup (dedup_key,last_sent_at,count) VALUES
  ('warranty:AST-LAP-0001:30d',NOW()-INTERVAL '6 hours',1)
ON CONFLICT (dedup_key) DO UPDATE SET last_sent_at=EXCLUDED.last_sent_at,count=EXCLUDED.count;

INSERT INTO user_alert_preferences (id,user_id,email_enabled,in_app_enabled,digest_frequency,digest_time,digest_day,email_min_severity,muted_rules)
SELECT
  '99642000-0000-0000-0000-000000000001'::uuid,u.id,true,true,'daily'::varchar,'08:30:00'::time,1,'warning'::varchar,
  '["ALT-CHECKOUT-OVERDUE"]'::jsonb
FROM users u WHERE u.email='ops.manager@netopsai.com'
ON CONFLICT (id) DO UPDATE SET
  user_id=EXCLUDED.user_id,email_enabled=EXCLUDED.email_enabled,in_app_enabled=EXCLUDED.in_app_enabled,digest_frequency=EXCLUDED.digest_frequency,
  digest_time=EXCLUDED.digest_time,digest_day=EXCLUDED.digest_day,email_min_severity=EXCLUDED.email_min_severity,muted_rules=EXCLUDED.muted_rules,updated_at=NOW();

INSERT INTO dashboard_widgets (id,widget_code,name,description,widget_type,data_source,data_config,default_size,min_width,min_height,refresh_interval,is_builtin,is_active,organization_id,created_by)
SELECT * FROM (
  SELECT
    '99643000-0000-0000-0000-000000000001'::uuid,'wgt-overdue-checkouts'::varchar,'Overdue Checkout Monitor'::varchar,
    'Track active overdue checkouts by assignee and aging bucket'::text,'stat_card'::varchar,'asset_checkouts'::varchar,
    '{"metric":"overdue_count","groupBy":"target_user"}'::jsonb,'medium'::varchar,1,1,300,true,true,o.id,u.id
  FROM organizations o JOIN users u ON u.email='admin@example.com' WHERE o.name='NetOpsAI Operations'
  UNION ALL
  SELECT
    '99643000-0000-0000-0000-000000000002'::uuid,'wgt-change-timeline'::varchar,'Change Timeline'::varchar,
    'Visualize submitted and approved CMDB changes in the next 7 days'::text,'timeline'::varchar,'cmdb_changes'::varchar,
    '{"windowDays":7,"status":["submitted","approved","implemented"]}'::jsonb,'large'::varchar,2,1,600,true,true,o.id,u.id
  FROM organizations o JOIN users u ON u.email='admin@example.com' WHERE o.name='NetOpsAI Operations'
) x(id,widget_code,name,description,widget_type,data_source,data_config,default_size,min_width,min_height,refresh_interval,is_builtin,is_active,organization_id,created_by)
ON CONFLICT (widget_code) DO UPDATE SET
  name=EXCLUDED.name,description=EXCLUDED.description,widget_type=EXCLUDED.widget_type,data_source=EXCLUDED.data_source,
  data_config=EXCLUDED.data_config,default_size=EXCLUDED.default_size,min_width=EXCLUDED.min_width,min_height=EXCLUDED.min_height,
  refresh_interval=EXCLUDED.refresh_interval,is_builtin=EXCLUDED.is_builtin,is_active=EXCLUDED.is_active,organization_id=EXCLUDED.organization_id,
  created_by=EXCLUDED.created_by,updated_at=NOW();

INSERT INTO user_dashboard_layouts (id,user_id,dashboard_type,layout)
SELECT
  '99644000-0000-0000-0000-000000000001'::uuid,u.id,'main'::varchar,
  '[{"widgetCode":"wgt-overdue-checkouts","x":0,"y":0,"w":4,"h":2},{"widgetCode":"wgt-change-timeline","x":4,"y":0,"w":8,"h":3}]'::jsonb
FROM users u
WHERE u.email='ops.manager@netopsai.com'
ON CONFLICT (user_id,dashboard_type) DO UPDATE SET
  layout=EXCLUDED.layout,updated_at=NOW();

INSERT INTO sessions (id,user_id,token,refresh_token,expires_at,refresh_expires_at,ip_address,user_agent,is_revoked,last_activity_at)
SELECT
  '99645000-0000-0000-0000-000000000001'::uuid,u.id,
  'seed-session-ops-manager-20260303'::varchar,'seed-refresh-ops-manager-20260303'::varchar,
  NOW()+INTERVAL '8 hours',NOW()+INTERVAL '7 days','10.10.10.25'::varchar,'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'::text,false,NOW()
FROM users u
WHERE u.email='ops.manager@netopsai.com'
ON CONFLICT (id) DO UPDATE SET
  user_id=EXCLUDED.user_id,token=EXCLUDED.token,refresh_token=EXCLUDED.refresh_token,expires_at=EXCLUDED.expires_at,
  refresh_expires_at=EXCLUDED.refresh_expires_at,ip_address=EXCLUDED.ip_address,user_agent=EXCLUDED.user_agent,
  is_revoked=EXCLUDED.is_revoked,last_activity_at=EXCLUDED.last_activity_at,updated_at=NOW();
INSERT INTO documents (id,title,summary,markdown,tags,created_by,updated_by)
SELECT * FROM (
  SELECT
    '99650000-0000-0000-0000-000000000001'::uuid,
    'Firewall Firmware Upgrade SOP'::text,
    'Standard operating procedure for perimeter firewall firmware upgrades'::text,
    'Checklist: backup, staged upgrade, failover test, smoke test, rollback validation.'::text,
    ARRAY['network','change','sop']::text[],
    u.id,u.id
  FROM users u WHERE u.email='security.lead@netopsai.com'
  UNION ALL
  SELECT
    '99650000-0000-0000-0000-000000000002'::uuid,
    'Q1 2026 Asset Audit Findings'::text,
    'Summary of discrepancies and corrective actions for Q1 physical audit'::text,
    'One perimeter firewall flagged with condition issue; remediation ticket linked.'::text,
    ARRAY['audit','q1-2026','compliance']::text[],
    u.id,u.id
  FROM users u WHERE u.email='cmdb.owner@netopsai.com'
) x(id,title,summary,markdown,tags,created_by,updated_by)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title,summary=EXCLUDED.summary,markdown=EXCLUDED.markdown,tags=EXCLUDED.tags,
  created_by=EXCLUDED.created_by,updated_by=EXCLUDED.updated_by,updated_at=NOW();

INSERT INTO document_files (id,document_id,storage_key,filename,sha256,size_bytes,mime_type)
VALUES
  ('99651000-0000-0000-0000-000000000001','99650000-0000-0000-0000-000000000001'::uuid,'documents/sop/firewall-upgrade-v1.pdf','firewall-upgrade-v1.pdf','f15a8b1d3c8f472531f8c3156df8fe95f5a1f7a5476c2f5ea2f6f63b2311c0a9',356742,'application/pdf')
ON CONFLICT (id) DO UPDATE SET
  document_id=EXCLUDED.document_id,storage_key=EXCLUDED.storage_key,filename=EXCLUDED.filename,sha256=EXCLUDED.sha256,size_bytes=EXCLUDED.size_bytes,mime_type=EXCLUDED.mime_type;

INSERT INTO document_relations (document_id,relation_type,relation_id)
SELECT d.id,'cmdb_change'::text,c.id::text
FROM documents d JOIN cmdb_changes c ON d.id='99650000-0000-0000-0000-000000000001'::uuid AND c.code='CHG-2026-0042'
ON CONFLICT (document_id,relation_type,relation_id) DO NOTHING;

INSERT INTO label_templates (id,template_code,name,description,label_type,size_preset,width_mm,height_mm,layout,fields,barcode_type,include_logo,include_company_name,font_family,font_size,is_default,is_active,organization_id,created_by,updated_by)
SELECT
  '99652000-0000-0000-0000-000000000001'::uuid,
  'LBL-ASSET-50x30'::varchar,
  'Asset Barcode 50x30'::varchar,
  'Default barcode label for laptops, servers, and network devices'::text,
  'combined'::varchar,'custom'::varchar,50,30,
  '{"barcode":{"x":3,"y":4,"w":44,"h":10},"title":{"x":3,"y":16},"meta":{"x":3,"y":22}}'::jsonb,
  '[{"key":"asset_code","label":"Asset Code"},{"key":"model","label":"Model"},{"key":"location","label":"Location"}]'::jsonb,
  'code128'::varchar,true,true,'DejaVu Sans'::varchar,9,true,true,o.id,u.id,u.id
FROM organizations o JOIN users u ON u.email='admin@example.com'
WHERE o.name='NetOpsAI Operations'
ON CONFLICT (template_code) DO UPDATE SET
  name=EXCLUDED.name,description=EXCLUDED.description,label_type=EXCLUDED.label_type,size_preset=EXCLUDED.size_preset,
  width_mm=EXCLUDED.width_mm,height_mm=EXCLUDED.height_mm,layout=EXCLUDED.layout,fields=EXCLUDED.fields,barcode_type=EXCLUDED.barcode_type,
  include_logo=EXCLUDED.include_logo,include_company_name=EXCLUDED.include_company_name,font_family=EXCLUDED.font_family,font_size=EXCLUDED.font_size,
  is_default=EXCLUDED.is_default,is_active=EXCLUDED.is_active,organization_id=EXCLUDED.organization_id,created_by=EXCLUDED.created_by,updated_by=EXCLUDED.updated_by,updated_at=NOW();

INSERT INTO label_settings (id,setting_key,setting_value,value_type,description,organization_id,updated_by)
SELECT
  '99653000-0000-0000-0000-000000000001'::uuid,
  'label.default_printer'::varchar,'Zebra-ZT411-Warehouse'::text,'string'::varchar,
  'Default printer used for warehouse and asset label runs'::text,o.id,u.id
FROM organizations o JOIN users u ON u.email='admin@example.com'
WHERE o.name='NetOpsAI Operations'
ON CONFLICT (setting_key,organization_id) DO UPDATE SET
  setting_value=EXCLUDED.setting_value,value_type=EXCLUDED.value_type,description=EXCLUDED.description,updated_by=EXCLUDED.updated_by,updated_at=NOW();

INSERT INTO print_jobs (id,job_code,template_id,asset_ids,asset_count,copies_per_asset,total_labels,printer_name,paper_size,status,output_type,output_url,started_at,completed_at,organization_id,created_by)
SELECT
  '99654000-0000-0000-0000-000000000001'::uuid,
  'PRN-2026-0001'::varchar,
  t.id,
  jsonb_build_array((SELECT id::text FROM assets WHERE asset_code='AST-LAP-0001' LIMIT 1),(SELECT id::text FROM assets WHERE asset_code='AST-SRV-0001' LIMIT 1)),
  2,1,2,'Zebra-ZT411-Warehouse'::varchar,'50x30mm'::varchar,'completed'::varchar,'pdf'::varchar,
  '/exports/labels/PRN-2026-0001.pdf'::text,NOW()-INTERVAL '4 hours',NOW()-INTERVAL '3 hours 55 minutes',o.id,u.id
FROM label_templates t
JOIN organizations o ON o.name='NetOpsAI Operations'
JOIN users u ON u.email='admin@example.com'
WHERE t.template_code='LBL-ASSET-50x30'
ON CONFLICT (job_code) DO UPDATE SET
  template_id=EXCLUDED.template_id,asset_ids=EXCLUDED.asset_ids,asset_count=EXCLUDED.asset_count,copies_per_asset=EXCLUDED.copies_per_asset,
  total_labels=EXCLUDED.total_labels,printer_name=EXCLUDED.printer_name,paper_size=EXCLUDED.paper_size,status=EXCLUDED.status,
  output_type=EXCLUDED.output_type,output_url=EXCLUDED.output_url,started_at=EXCLUDED.started_at,completed_at=EXCLUDED.completed_at,
  organization_id=EXCLUDED.organization_id,created_by=EXCLUDED.created_by,updated_at=NOW();

INSERT INTO print_job_items (id,print_job_id,asset_id,copy_number,status,label_data)
SELECT * FROM (
  SELECT
    '99654100-0000-0000-0000-000000000001'::uuid,pj.id,a.id,1,'completed'::varchar,
    '{"assetCode":"AST-LAP-0001","model":"Latitude 7440","location":"HQ"}'::jsonb
  FROM print_jobs pj JOIN assets a ON a.asset_code='AST-LAP-0001' WHERE pj.job_code='PRN-2026-0001'
  UNION ALL
  SELECT
    '99654100-0000-0000-0000-000000000002'::uuid,pj.id,a.id,1,'completed'::varchar,
    '{"assetCode":"AST-SRV-0001","model":"ProLiant DL380 Gen10","location":"HQ Data Center"}'::jsonb
  FROM print_jobs pj JOIN assets a ON a.asset_code='AST-SRV-0001' WHERE pj.job_code='PRN-2026-0001'
) x(id,print_job_id,asset_id,copy_number,status,label_data)
ON CONFLICT (id) DO UPDATE SET
  print_job_id=EXCLUDED.print_job_id,asset_id=EXCLUDED.asset_id,copy_number=EXCLUDED.copy_number,status=EXCLUDED.status,label_data=EXCLUDED.label_data;

INSERT INTO report_definitions (id,report_code,name,description,report_type,data_source,fields,filters,default_filters,sorting,chart_config,access_level,is_scheduled,schedule_cron,schedule_recipients,schedule_format,is_builtin,is_active,organization_id,created_by,updated_by)
SELECT * FROM (
  SELECT
    '99655000-0000-0000-0000-000000000001'::uuid,'RPT-CMDB-CHG-PIPE'::varchar,'CMDB Change Pipeline'::varchar,
    'Pipeline report for submitted/approved/implemented changes'::text,'tabular'::varchar,'cmdb_changes'::varchar,
    '["code","title","status","risk","planned_start_at"]'::jsonb,'["status","risk"]'::jsonb,'{"status":["submitted","approved","implemented"]}'::jsonb,
    '[{"field":"planned_start_at","direction":"asc"}]'::jsonb,'{}'::jsonb,'all'::varchar,false,NULL::varchar,'[]'::jsonb,'excel'::varchar,true,true,o.id,u.id,u.id
  FROM organizations o JOIN users u ON u.email='admin@example.com' WHERE o.name='NetOpsAI Operations'
  UNION ALL
  SELECT
    '99655000-0000-0000-0000-000000000002'::uuid,'RPT-AUDIT-HEALTH'::varchar,'Audit Health Summary'::varchar,
    'Dashboard snapshot for ongoing physical audits and discrepancy closure'::text,'dashboard'::varchar,'audit_sessions'::varchar,
    '["audit_code","status","missing_items","misplaced_items","audited_items"]'::jsonb,'["status"]'::jsonb,'{"status":["in_progress","reviewing"]}'::jsonb,
    '[{"field":"updated_at","direction":"desc"}]'::jsonb,'{"type":"bar","x":"audit_code","y":"missing_items"}'::jsonb,'all'::varchar,true,'0 8 * * 1'::varchar,'["ops.manager@netopsai.com"]'::jsonb,'pdf'::varchar,true,true,o.id,u.id,u.id
  FROM organizations o JOIN users u ON u.email='admin@example.com' WHERE o.name='NetOpsAI Operations'
) x(id,report_code,name,description,report_type,data_source,fields,filters,default_filters,sorting,chart_config,access_level,is_scheduled,schedule_cron,schedule_recipients,schedule_format,is_builtin,is_active,organization_id,created_by,updated_by)
ON CONFLICT (report_code) DO UPDATE SET
  name=EXCLUDED.name,description=EXCLUDED.description,report_type=EXCLUDED.report_type,data_source=EXCLUDED.data_source,
  fields=EXCLUDED.fields,filters=EXCLUDED.filters,default_filters=EXCLUDED.default_filters,sorting=EXCLUDED.sorting,chart_config=EXCLUDED.chart_config,
  access_level=EXCLUDED.access_level,is_scheduled=EXCLUDED.is_scheduled,schedule_cron=EXCLUDED.schedule_cron,schedule_recipients=EXCLUDED.schedule_recipients,
  schedule_format=EXCLUDED.schedule_format,is_builtin=EXCLUDED.is_builtin,is_active=EXCLUDED.is_active,organization_id=EXCLUDED.organization_id,
  created_by=EXCLUDED.created_by,updated_by=EXCLUDED.updated_by,updated_at=NOW();

INSERT INTO report_executions (id,report_id,execution_type,status,filters_used,row_count,file_path,file_format,file_size_bytes,started_at,completed_at,duration_ms,recipients,delivery_status,executed_by)
SELECT
  '99655100-0000-0000-0000-000000000001'::uuid,r.id,'manual'::varchar,'completed'::varchar,'{"status":["approved","implemented"]}'::jsonb,1,
  '/exports/reports/RPT-CMDB-CHG-PIPE-20260303.xlsx'::varchar,'excel'::varchar,184320,
  NOW()-INTERVAL '2 hours',NOW()-INTERVAL '1 hour 59 minutes',60000,'["ops.manager@netopsai.com"]'::jsonb,'sent'::varchar,
  (SELECT id FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1)
FROM report_definitions r
WHERE r.report_code='RPT-CMDB-CHG-PIPE'
ON CONFLICT (id) DO UPDATE SET
  report_id=EXCLUDED.report_id,execution_type=EXCLUDED.execution_type,status=EXCLUDED.status,filters_used=EXCLUDED.filters_used,
  row_count=EXCLUDED.row_count,file_path=EXCLUDED.file_path,file_format=EXCLUDED.file_format,file_size_bytes=EXCLUDED.file_size_bytes,
  started_at=EXCLUDED.started_at,completed_at=EXCLUDED.completed_at,duration_ms=EXCLUDED.duration_ms,
  recipients=EXCLUDED.recipients,delivery_status=EXCLUDED.delivery_status,executed_by=EXCLUDED.executed_by;
INSERT INTO audit_sessions (id,audit_code,name,audit_type,scope_description,start_date,end_date,status,notes,total_items,audited_items,found_items,missing_items,misplaced_items,organization_id,created_by,completed_at,completed_by,completion_notes)
SELECT
  '99660000-0000-0000-0000-000000000001'::uuid,
  'AUD-2026-Q1-HQDC'::varchar,
  'Q1 2026 HQ Data Center Physical Audit'::varchar,
  'full'::varchar,
  'Quarterly physical audit for data center servers and network perimeter devices'::text,
  CURRENT_DATE-15,CURRENT_DATE+5,'reviewing'::varchar,
  'Most critical assets verified; one firewall requires follow-up condition check'::text,
  2,2,1,0,1,o.id,u.id,NULL::timestamptz,NULL::uuid,NULL::text
FROM organizations o JOIN users u ON u.email='cmdb.owner@netopsai.com'
WHERE o.name='NetOpsAI Operations'
ON CONFLICT (audit_code) DO UPDATE SET
  name=EXCLUDED.name,audit_type=EXCLUDED.audit_type,scope_description=EXCLUDED.scope_description,start_date=EXCLUDED.start_date,end_date=EXCLUDED.end_date,
  status=EXCLUDED.status,notes=EXCLUDED.notes,total_items=EXCLUDED.total_items,audited_items=EXCLUDED.audited_items,found_items=EXCLUDED.found_items,
  missing_items=EXCLUDED.missing_items,misplaced_items=EXCLUDED.misplaced_items,organization_id=EXCLUDED.organization_id,created_by=EXCLUDED.created_by,
  completed_at=EXCLUDED.completed_at,completed_by=EXCLUDED.completed_by,completion_notes=EXCLUDED.completion_notes,updated_at=NOW();

INSERT INTO audit_locations (id,audit_id,location_id)
SELECT
  '99661000-0000-0000-0000-000000000001'::uuid,a.id,l.id
FROM audit_sessions a JOIN locations l ON l.name='HQ Data Center'
WHERE a.audit_code='AUD-2026-Q1-HQDC'
ON CONFLICT (audit_id,location_id) DO NOTHING;

INSERT INTO audit_categories (id,audit_id,category_id)
SELECT
  '99661100-0000-0000-0000-000000000001'::uuid,a.id,c.id
FROM audit_sessions a JOIN asset_categories c ON c.name='Server'
WHERE a.audit_code='AUD-2026-Q1-HQDC'
ON CONFLICT (audit_id,category_id) DO NOTHING;

INSERT INTO audit_auditors (id,audit_id,user_id,assigned_location_id,is_lead)
SELECT
  '99661200-0000-0000-0000-000000000001'::uuid,a.id,u.id,l.id,true
FROM audit_sessions a
JOIN users u ON u.email='cmdb.owner@netopsai.com'
JOIN locations l ON l.name='HQ Data Center'
WHERE a.audit_code='AUD-2026-Q1-HQDC'
ON CONFLICT (audit_id,user_id) DO UPDATE SET assigned_location_id=EXCLUDED.assigned_location_id,is_lead=EXCLUDED.is_lead;

INSERT INTO audit_items (id,audit_id,asset_id,expected_location_id,expected_condition,audit_status,actual_location_id,actual_condition,audited_by,audited_at,notes,resolution_status)
SELECT * FROM (
  SELECT
    '99661300-0000-0000-0000-000000000001'::uuid,a.id,ast.id,l.id,'good'::varchar,'found'::varchar,l.id,'good'::varchar,
    u.id,NOW()-INTERVAL '4 days','Server found in expected rack and condition verified'::text,'resolved'::varchar
  FROM audit_sessions a
  JOIN assets ast ON ast.asset_code='AST-SRV-0001'
  JOIN locations l ON l.id=ast.location_id
  JOIN users u ON u.email='cmdb.owner@netopsai.com'
  WHERE a.audit_code='AUD-2026-Q1-HQDC'
  UNION ALL
  SELECT
    '99661300-0000-0000-0000-000000000002'::uuid,a.id,ast.id,l.id,'good'::varchar,'condition_issue'::varchar,l.id,'needs_repair'::varchar,
    u.id,NOW()-INTERVAL '3 days','Firewall found on-site but fan alert requires maintenance verification'::text,'pending_action'::varchar
  FROM audit_sessions a
  JOIN assets ast ON ast.asset_code='AST-FW-0001'
  JOIN locations l ON l.id=ast.location_id
  JOIN users u ON u.email='cmdb.owner@netopsai.com'
  WHERE a.audit_code='AUD-2026-Q1-HQDC'
) x(id,audit_id,asset_id,expected_location_id,expected_condition,audit_status,actual_location_id,actual_condition,audited_by,audited_at,notes,resolution_status)
ON CONFLICT (audit_id,asset_id) DO UPDATE SET
  expected_location_id=EXCLUDED.expected_location_id,expected_condition=EXCLUDED.expected_condition,audit_status=EXCLUDED.audit_status,
  actual_location_id=EXCLUDED.actual_location_id,actual_condition=EXCLUDED.actual_condition,audited_by=EXCLUDED.audited_by,audited_at=EXCLUDED.audited_at,
  notes=EXCLUDED.notes,resolution_status=EXCLUDED.resolution_status,updated_at=NOW();

INSERT INTO audit_history (id,audit_id,action,actor_id,old_status,new_status,details,created_at)
SELECT * FROM (
  SELECT
    '99661400-0000-0000-0000-000000000001'::uuid,a.id,'audit.started'::varchar,u.id,'draft'::varchar,'in_progress'::varchar,
    '{"scope":"HQ Data Center","items":2}'::jsonb,NOW()-INTERVAL '5 days'
  FROM audit_sessions a JOIN users u ON u.email='cmdb.owner@netopsai.com' WHERE a.audit_code='AUD-2026-Q1-HQDC'
  UNION ALL
  SELECT
    '99661400-0000-0000-0000-000000000002'::uuid,a.id,'audit.reviewing'::varchar,u.id,'in_progress'::varchar,'reviewing'::varchar,
    '{"conditionIssues":1,"missing":0}'::jsonb,NOW()-INTERVAL '2 days'
  FROM audit_sessions a JOIN users u ON u.email='security.lead@netopsai.com' WHERE a.audit_code='AUD-2026-Q1-HQDC'
) x(id,audit_id,action,actor_id,old_status,new_status,details,created_at)
ON CONFLICT (id) DO UPDATE SET
  audit_id=EXCLUDED.audit_id,action=EXCLUDED.action,actor_id=EXCLUDED.actor_id,old_status=EXCLUDED.old_status,new_status=EXCLUDED.new_status,details=EXCLUDED.details,created_at=EXCLUDED.created_at;

INSERT INTO audit_unregistered_assets (id,audit_id,temporary_id,description,serial_number,location_found_id,condition,action,action_notes,found_by,found_at)
SELECT
  '99661500-0000-0000-0000-000000000001'::uuid,a.id,'TEMP-UNREG-0001'::varchar,
  'Unregistered SFP transceiver tray discovered in network rack cabinet'::text,'SFP-TRAY-2026-001'::varchar,l.id,
  'good'::varchar,'investigate'::varchar,'Verify if spare part should be registered under warehouse stock'::text,u.id,NOW()-INTERVAL '3 days'
FROM audit_sessions a
JOIN locations l ON l.name='HQ Data Center'
JOIN users u ON u.email='cmdb.owner@netopsai.com'
WHERE a.audit_code='AUD-2026-Q1-HQDC'
ON CONFLICT (id) DO UPDATE SET
  audit_id=EXCLUDED.audit_id,temporary_id=EXCLUDED.temporary_id,description=EXCLUDED.description,serial_number=EXCLUDED.serial_number,
  location_found_id=EXCLUDED.location_found_id,condition=EXCLUDED.condition,action=EXCLUDED.action,action_notes=EXCLUDED.action_notes,found_by=EXCLUDED.found_by,found_at=EXCLUDED.found_at,updated_at=NOW();

INSERT INTO audit_logs (id,correlation_id,user_id,action,resource,details,created_at)
VALUES
  ('99661600-0000-0000-0000-000000000001'::uuid,'AUD-2026-Q1-HQDC','cmdb.owner@netopsai.com','audit.session.review_started','audit_sessions','{"auditCode":"AUD-2026-Q1-HQDC","status":"reviewing"}'::jsonb,NOW()-INTERVAL '2 days')
ON CONFLICT (id) DO UPDATE SET
  correlation_id=EXCLUDED.correlation_id,user_id=EXCLUDED.user_id,action=EXCLUDED.action,resource=EXCLUDED.resource,details=EXCLUDED.details,created_at=EXCLUDED.created_at;

INSERT INTO approval_chain_templates (id,name,description,asset_category_id,min_value,max_value,request_type,priority,steps,is_active,organization_id,created_by)
SELECT
  '99670000-0000-0000-0000-000000000001'::uuid,
  'Laptop Request Standard Approval'::varchar,
  'Two-step approval for standard laptop procurement requests'::text,
  c.id,1500,5000,'new'::varchar,10,
  '[{"stepOrder":1,"role":"it_asset_manager"},{"stepOrder":2,"role":"super_admin"}]'::jsonb,
  true,o.id,u.id
FROM asset_categories c
JOIN organizations o ON o.name='NetOpsAI Operations'
JOIN users u ON u.email='admin@example.com'
WHERE c.name='Laptop'
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name,description=EXCLUDED.description,asset_category_id=EXCLUDED.asset_category_id,min_value=EXCLUDED.min_value,max_value=EXCLUDED.max_value,
  request_type=EXCLUDED.request_type,priority=EXCLUDED.priority,steps=EXCLUDED.steps,is_active=EXCLUDED.is_active,organization_id=EXCLUDED.organization_id,
  created_by=EXCLUDED.created_by,updated_at=NOW();

INSERT INTO approval_steps (id,request_id,step_order,approver_id,approver_role,status,decision_date,comments)
SELECT * FROM (
  SELECT
    '99670100-0000-0000-0000-000000000001'::uuid,r.id,1,u.id,'it_asset_manager'::varchar,'approved'::varchar,
    NOW()-INTERVAL '20 hours','Approved after budget check and stock confirmation'::text
  FROM asset_requests r JOIN users u ON u.email='ops.manager@netopsai.com'
  WHERE r.request_code='REQ-2026-0001'
  UNION ALL
  SELECT
    '99670100-0000-0000-0000-000000000002'::uuid,r.id,2,u.id,'super_admin'::varchar,'pending'::varchar,
    NULL::timestamptz,NULL::text
  FROM asset_requests r JOIN users u ON u.email='security.lead@netopsai.com'
  WHERE r.request_code='REQ-2026-0001'
) x(id,request_id,step_order,approver_id,approver_role,status,decision_date,comments)
ON CONFLICT (request_id,step_order) DO UPDATE SET
  approver_id=EXCLUDED.approver_id,approver_role=EXCLUDED.approver_role,status=EXCLUDED.status,decision_date=EXCLUDED.decision_date,comments=EXCLUDED.comments,updated_at=NOW();

INSERT INTO depreciation_settings (id,setting_key,setting_value,value_type,description,organization_id,updated_by)
SELECT * FROM (
  SELECT
    '99680000-0000-0000-0000-000000000001'::uuid,'depreciation.run_day'::varchar,'5'::text,'number'::varchar,
    'Day of month when monthly depreciation run is scheduled'::text,o.id,u.id
  FROM organizations o JOIN users u ON u.email='admin@example.com' WHERE o.name='NetOpsAI Operations'
  UNION ALL
  SELECT
    '99680000-0000-0000-0000-000000000002'::uuid,'depreciation.auto_post'::varchar,'true'::text,'boolean'::varchar,
    'Automatically post generated depreciation entries after validation'::text,o.id,u.id
  FROM organizations o JOIN users u ON u.email='admin@example.com' WHERE o.name='NetOpsAI Operations'
) x(id,setting_key,setting_value,value_type,description,organization_id,updated_by)
ON CONFLICT (setting_key,organization_id) DO UPDATE SET
  setting_value=EXCLUDED.setting_value,value_type=EXCLUDED.value_type,description=EXCLUDED.description,updated_by=EXCLUDED.updated_by,updated_at=NOW();

INSERT INTO depreciation_schedules (id,asset_id,depreciation_method,original_cost,salvage_value,useful_life_years,start_date,end_date,monthly_depreciation,accumulated_depreciation,book_value,currency,status,notes,organization_id,created_by,updated_by)
SELECT
  '99681000-0000-0000-0000-000000000001'::uuid,
  a.id,'straight_line'::varchar,120000000,12000000,5,
  DATE '2025-01-01',DATE '2029-12-31',1800000,19800000,100200000,'VND'::varchar,'active'::varchar,
  'Server depreciation schedule aligned with finance policy FY2025-2029'::text,o.id,u.id,u.id
FROM assets a
JOIN organizations o ON o.name='NetOpsAI Operations'
JOIN users u ON u.email='admin@example.com'
WHERE a.asset_code='AST-SRV-0001'
ON CONFLICT (asset_id) DO UPDATE SET
  depreciation_method=EXCLUDED.depreciation_method,original_cost=EXCLUDED.original_cost,salvage_value=EXCLUDED.salvage_value,
  useful_life_years=EXCLUDED.useful_life_years,start_date=EXCLUDED.start_date,end_date=EXCLUDED.end_date,monthly_depreciation=EXCLUDED.monthly_depreciation,
  accumulated_depreciation=EXCLUDED.accumulated_depreciation,book_value=EXCLUDED.book_value,currency=EXCLUDED.currency,status=EXCLUDED.status,
  notes=EXCLUDED.notes,organization_id=EXCLUDED.organization_id,created_by=EXCLUDED.created_by,updated_by=EXCLUDED.updated_by,updated_at=NOW();

INSERT INTO depreciation_runs (id,run_code,period_year,period_month,run_type,status,entries_created,entries_posted,total_depreciation,started_at,completed_at,organization_id,created_by)
SELECT
  '99682000-0000-0000-0000-000000000001'::uuid,
  'DEP-2026-02'::varchar,2026,2,'monthly'::varchar,'completed'::varchar,1,1,1800000,
  NOW()-INTERVAL '26 days',NOW()-INTERVAL '26 days 5 minutes',o.id,u.id
FROM organizations o JOIN users u ON u.email='admin@example.com'
WHERE o.name='NetOpsAI Operations'
ON CONFLICT (run_code) DO UPDATE SET
  period_year=EXCLUDED.period_year,period_month=EXCLUDED.period_month,run_type=EXCLUDED.run_type,status=EXCLUDED.status,
  entries_created=EXCLUDED.entries_created,entries_posted=EXCLUDED.entries_posted,total_depreciation=EXCLUDED.total_depreciation,
  started_at=EXCLUDED.started_at,completed_at=EXCLUDED.completed_at,organization_id=EXCLUDED.organization_id,created_by=EXCLUDED.created_by;

INSERT INTO depreciation_entries (id,schedule_id,asset_id,period_year,period_month,period_start,period_end,depreciation_amount,accumulated_after,book_value_after,entry_date,is_posted,posted_at,posted_by,notes)
SELECT
  '99683000-0000-0000-0000-000000000001'::uuid,s.id,a.id,2026,2,DATE '2026-02-01',DATE '2026-02-28',1800000,19800000,100200000,
  DATE '2026-02-28',true,NOW()-INTERVAL '25 days',(SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),
  'Monthly straight-line depreciation posting for authentication server'::text
FROM depreciation_schedules s
JOIN assets a ON a.id=s.asset_id
WHERE a.asset_code='AST-SRV-0001'
ON CONFLICT (schedule_id,period_year,period_month) DO UPDATE SET
  asset_id=EXCLUDED.asset_id,period_start=EXCLUDED.period_start,period_end=EXCLUDED.period_end,depreciation_amount=EXCLUDED.depreciation_amount,
  accumulated_after=EXCLUDED.accumulated_after,book_value_after=EXCLUDED.book_value_after,entry_date=EXCLUDED.entry_date,is_posted=EXCLUDED.is_posted,
  posted_at=EXCLUDED.posted_at,posted_by=EXCLUDED.posted_by,notes=EXCLUDED.notes;

INSERT INTO wf_definitions (id,key,name,request_type,version,is_active)
VALUES
  ('99690000-0000-0000-0000-000000000001'::uuid,'wf-procurement-standard','Procurement Standard Workflow','procurement',1,true)
ON CONFLICT (key) DO UPDATE SET name=EXCLUDED.name,request_type=EXCLUDED.request_type,version=EXCLUDED.version,is_active=EXCLUDED.is_active,updated_at=NOW();

INSERT INTO wf_steps (id,definition_id,step_no,name,approver_rule,on_approve,on_reject,sla_hours)
SELECT * FROM (
  SELECT
    '99691000-0000-0000-0000-000000000001'::uuid,d.id,1,'Manager Approval'::varchar,
    '{"role":"it_asset_manager"}'::jsonb,'{"nextStep":2}'::jsonb,'{"status":"rejected"}'::jsonb,24
  FROM wf_definitions d WHERE d.key='wf-procurement-standard'
  UNION ALL
  SELECT
    '99691000-0000-0000-0000-000000000002'::uuid,d.id,2,'Security Approval'::varchar,
    '{"role":"super_admin"}'::jsonb,'{"status":"approved"}'::jsonb,'{"status":"rejected"}'::jsonb,24
  FROM wf_definitions d WHERE d.key='wf-procurement-standard'
) x(id,definition_id,step_no,name,approver_rule,on_approve,on_reject,sla_hours)
ON CONFLICT (definition_id,step_no) DO UPDATE SET
  name=EXCLUDED.name,approver_rule=EXCLUDED.approver_rule,on_approve=EXCLUDED.on_approve,on_reject=EXCLUDED.on_reject,sla_hours=EXCLUDED.sla_hours;

INSERT INTO wf_requests (id,code,title,request_type,priority,status,requester_id,requester_ou_id,definition_id,current_step_no,due_at,payload,submitted_at)
SELECT
  '99692000-0000-0000-0000-000000000001'::uuid,
  'WF-2026-0001'::varchar,
  'Procurement request: 10G optics for server uplink expansion'::varchar,
  'procurement'::varchar,'high'::varchar,'submitted'::varchar,
  u.id,ou.id,d.id,1,NOW()+INTERVAL '3 days',
  '{"businessJustification":"Increase redundancy for core authentication services","costCenter":"IT-OPS"}'::jsonb,
  NOW()-INTERVAL '6 hours'
FROM users u
JOIN org_units ou ON ou.path='/corporate-it/noc'
JOIN wf_definitions d ON d.key='wf-procurement-standard'
WHERE u.email='ops.manager@netopsai.com'
ON CONFLICT (code) DO UPDATE SET
  title=EXCLUDED.title,request_type=EXCLUDED.request_type,priority=EXCLUDED.priority,status=EXCLUDED.status,
  requester_id=EXCLUDED.requester_id,requester_ou_id=EXCLUDED.requester_ou_id,definition_id=EXCLUDED.definition_id,current_step_no=EXCLUDED.current_step_no,
  due_at=EXCLUDED.due_at,payload=EXCLUDED.payload,submitted_at=EXCLUDED.submitted_at,updated_at=NOW();

INSERT INTO wf_request_lines (id,request_id,line_no,item_type,asset_id,part_id,requested_qty,fulfilled_qty,unit_cost,note,metadata,status)
SELECT * FROM (
  SELECT
    '99692100-0000-0000-0000-000000000001'::uuid,r.id,1,'part'::varchar,NULL::uuid,p.id,2,0,95.00,
    '10G SFP modules for resilient uplink pair'::text,'{"sku":"SP-GBIC-SX"}'::jsonb,'pending'::varchar
  FROM wf_requests r JOIN spare_parts p ON p.part_code='SP-GBIC-SX'
  WHERE r.code='WF-2026-0001'
  UNION ALL
  SELECT
    '99692100-0000-0000-0000-000000000002'::uuid,r.id,2,'asset'::varchar,a.id,NULL::uuid,1,0,NULL::numeric,
    'Assign a spare laptop for change execution fallback'::text,'{"assetCode":"AST-LAP-0002"}'::jsonb,'pending'::varchar
  FROM wf_requests r JOIN assets a ON a.asset_code='AST-LAP-0002'
  WHERE r.code='WF-2026-0001'
) x(id,request_id,line_no,item_type,asset_id,part_id,requested_qty,fulfilled_qty,unit_cost,note,metadata,status)
ON CONFLICT (request_id,line_no) DO UPDATE SET
  item_type=EXCLUDED.item_type,asset_id=EXCLUDED.asset_id,part_id=EXCLUDED.part_id,requested_qty=EXCLUDED.requested_qty,
  fulfilled_qty=EXCLUDED.fulfilled_qty,unit_cost=EXCLUDED.unit_cost,note=EXCLUDED.note,metadata=EXCLUDED.metadata,status=EXCLUDED.status,updated_at=NOW();

INSERT INTO wf_attachments (id,request_id,file_key,filename,size,mime,uploaded_by)
SELECT
  '99692200-0000-0000-0000-000000000001'::uuid,r.id,
  'wf/WF-2026-0001/vendor-quote.pdf'::varchar,'vendor-quote.pdf'::varchar,142231,'application/pdf'::varchar,
  (SELECT id FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1)
FROM wf_requests r
WHERE r.code='WF-2026-0001'
ON CONFLICT (id) DO UPDATE SET
  request_id=EXCLUDED.request_id,file_key=EXCLUDED.file_key,filename=EXCLUDED.filename,size=EXCLUDED.size,mime=EXCLUDED.mime,uploaded_by=EXCLUDED.uploaded_by;

INSERT INTO wf_events (id,request_id,event_type,actor_id,meta,created_at)
SELECT * FROM (
  SELECT
    '99692300-0000-0000-0000-000000000001'::uuid,r.id,'created'::varchar,u.id,'{"source":"seed-step3"}'::jsonb,NOW()-INTERVAL '7 hours'
  FROM wf_requests r JOIN users u ON u.email='ops.manager@netopsai.com' WHERE r.code='WF-2026-0001'
  UNION ALL
  SELECT
    '99692300-0000-0000-0000-000000000002'::uuid,r.id,'submitted'::varchar,u.id,'{"currentStep":1}'::jsonb,NOW()-INTERVAL '6 hours'
  FROM wf_requests r JOIN users u ON u.email='ops.manager@netopsai.com' WHERE r.code='WF-2026-0001'
) x(id,request_id,event_type,actor_id,meta,created_at)
ON CONFLICT (id) DO UPDATE SET
  request_id=EXCLUDED.request_id,event_type=EXCLUDED.event_type,actor_id=EXCLUDED.actor_id,meta=EXCLUDED.meta,created_at=EXCLUDED.created_at;

INSERT INTO wf_approvals (id,request_id,step_id,step_no,assignee_user_id,status,due_at,version)
SELECT
  '99692400-0000-0000-0000-000000000001'::uuid,
  r.id,s.id,1,u.id,'pending'::varchar,NOW()+INTERVAL '18 hours',1
FROM wf_requests r
JOIN wf_steps s ON s.definition_id=r.definition_id AND s.step_no=1
JOIN users u ON u.email='ops.manager@netopsai.com'
WHERE r.code='WF-2026-0001'
ON CONFLICT (id) DO UPDATE SET
  request_id=EXCLUDED.request_id,step_id=EXCLUDED.step_id,step_no=EXCLUDED.step_no,assignee_user_id=EXCLUDED.assignee_user_id,status=EXCLUDED.status,due_at=EXCLUDED.due_at,version=EXCLUDED.version,updated_at=NOW();

INSERT INTO pending_actions (action_id,conversation_id,correlation_id,channel_id,external_chat_id,external_user_id,action_kind,payload,requires_reason,status,expires_at,reason)
VALUES
  ('99693000-0000-0000-0000-000000000001'::uuid,'99100000-0000-0000-0000-000000000001','99693000-1000-0000-0000-000000000001'::uuid,'99900000-0000-0000-0000-000000000101'::uuid,'tg-chat-ops-001','ops-manager-telegram','checkout_extension_confirm',jsonb_build_object('checkoutCode','CO-2026-0002','requestedUntil',(CURRENT_DATE+21)::text),false,'pending',NOW()+INTERVAL '2 hours',NULL::text)
ON CONFLICT (action_id) DO UPDATE SET
  conversation_id=EXCLUDED.conversation_id,correlation_id=EXCLUDED.correlation_id,channel_id=EXCLUDED.channel_id,
  external_chat_id=EXCLUDED.external_chat_id,external_user_id=EXCLUDED.external_user_id,action_kind=EXCLUDED.action_kind,
  payload=EXCLUDED.payload,requires_reason=EXCLUDED.requires_reason,status=EXCLUDED.status,expires_at=EXCLUDED.expires_at,reason=EXCLUDED.reason;

INSERT INTO inbound_dedup (channel_id,external_event_id,received_at)
VALUES ('99900000-0000-0000-0000-000000000102'::uuid,'email-msg-20260303-0001',NOW()-INTERVAL '30 minutes')
ON CONFLICT (channel_id,external_event_id) DO UPDATE SET received_at=EXCLUDED.received_at;

INSERT INTO message_links (id,conversation_id,internal_message_id,channel_id,external_message_id,thread_id)
VALUES
  ('99694000-0000-0000-0000-000000000001'::uuid,'99100000-0000-0000-0000-000000000001','99100000-1000-0000-0000-000000000001'::uuid,'99900000-0000-0000-0000-000000000101'::uuid,'tg-msg-23891','incident-0315-thread')
ON CONFLICT (id) DO UPDATE SET
  conversation_id=EXCLUDED.conversation_id,internal_message_id=EXCLUDED.internal_message_id,channel_id=EXCLUDED.channel_id,
  external_message_id=EXCLUDED.external_message_id,thread_id=EXCLUDED.thread_id;

INSERT INTO setup_migration_runs (file_name,checksum,status,error,applied_at)
VALUES
  ('046_security_compliance.sql','sha256:3f7f0b2d7f9051b45c9481cdd2a7e4e8f3584c13f6b14df5a414d0be9f6d8bd0','applied',NULL::text,NOW()-INTERVAL '14 days')
ON CONFLICT (file_name) DO UPDATE SET
  checksum=EXCLUDED.checksum,status=EXCLUDED.status,error=EXCLUDED.error,applied_at=EXCLUDED.applied_at;

COMMIT;
