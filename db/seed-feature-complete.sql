-- Supplemental seed for under-seeded modules (schema-compatible, idempotent)
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE has_tenant boolean; default_tenant uuid;
BEGIN
  IF to_regclass('public.users') IS NULL THEN RETURN; END IF;
  has_tenant := EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='tenant_id'
  );
  IF has_tenant AND to_regclass('public.tenants') IS NOT NULL THEN
    SELECT id INTO default_tenant FROM tenants ORDER BY created_at LIMIT 1;
    INSERT INTO users (id,email,name,username,password_hash,role,tier,status,is_active,tenant_id) VALUES
      ('99000000-0000-0000-0000-000000000001','admin@example.com','System Administrator','admin','$2b$12$p3KnfAjGe6E.5EbQSo/ipepPpxEX1BMyF9UzyNSIKTI6gCUj8OoF.','admin','enterprise','active',true,default_tenant),
      ('99000000-0000-0000-0000-000000000002','ops.manager@netopsai.com','Operations Manager','ops.manager','$2b$12$p3KnfAjGe6E.5EbQSo/ipepPpxEX1BMyF9UzyNSIKTI6gCUj8OoF.','it_asset_manager','pro','active',true,default_tenant),
      ('99000000-0000-0000-0000-000000000003','cmdb.owner@netopsai.com','CMDB Owner','cmdb.owner','$2b$12$p3KnfAjGe6E.5EbQSo/ipepPpxEX1BMyF9UzyNSIKTI6gCUj8OoF.','technician','pro','active',true,default_tenant),
      ('99000000-0000-0000-0000-000000000004','security.lead@netopsai.com','Security Lead','security.lead','$2b$12$p3KnfAjGe6E.5EbQSo/ipepPpxEX1BMyF9UzyNSIKTI6gCUj8OoF.','super_admin','enterprise','active',true,default_tenant)
    ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, username=EXCLUDED.username, role=EXCLUDED.role, tier=EXCLUDED.tier, status=EXCLUDED.status, is_active=EXCLUDED.is_active, tenant_id=COALESCE(EXCLUDED.tenant_id, users.tenant_id), updated_at=NOW();
  ELSE
    INSERT INTO users (id,email,name,username,password_hash,role,tier,status,is_active) VALUES
      ('99000000-0000-0000-0000-000000000001','admin@example.com','System Administrator','admin','$2b$12$p3KnfAjGe6E.5EbQSo/ipepPpxEX1BMyF9UzyNSIKTI6gCUj8OoF.','admin','enterprise','active',true),
      ('99000000-0000-0000-0000-000000000002','ops.manager@netopsai.com','Operations Manager','ops.manager','$2b$12$p3KnfAjGe6E.5EbQSo/ipepPpxEX1BMyF9UzyNSIKTI6gCUj8OoF.','it_asset_manager','pro','active',true),
      ('99000000-0000-0000-0000-000000000003','cmdb.owner@netopsai.com','CMDB Owner','cmdb.owner','$2b$12$p3KnfAjGe6E.5EbQSo/ipepPpxEX1BMyF9UzyNSIKTI6gCUj8OoF.','technician','pro','active',true),
      ('99000000-0000-0000-0000-000000000004','security.lead@netopsai.com','Security Lead','security.lead','$2b$12$p3KnfAjGe6E.5EbQSo/ipepPpxEX1BMyF9UzyNSIKTI6gCUj8OoF.','super_admin','enterprise','active',true)
    ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, username=EXCLUDED.username, role=EXCLUDED.role, tier=EXCLUDED.tier, status=EXCLUDED.status, is_active=EXCLUDED.is_active, updated_at=NOW();
  END IF;
END $$;

INSERT INTO ai_providers (id,name,description,api_endpoint,auth_type,capabilities,status,rate_limit_per_minute,tokens_used,metadata) VALUES
  ('openai','OpenAI','Primary provider for ops workflows','https://api.openai.com/v1','bearer','{"chat":true,"tools":true,"vision":true}'::jsonb,'active',3500,1285000,'{"priority":1}'::jsonb),
  ('anthropic','Anthropic','Fallback provider for long-context analysis','https://api.anthropic.com/v1','bearer','{"chat":true,"tools":true,"vision":false}'::jsonb,'active',2200,484000,'{"priority":2}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,api_endpoint=EXCLUDED.api_endpoint,auth_type=EXCLUDED.auth_type,capabilities=EXCLUDED.capabilities,status=EXCLUDED.status,rate_limit_per_minute=EXCLUDED.rate_limit_per_minute,tokens_used=EXCLUDED.tokens_used,metadata=EXCLUDED.metadata,updated_at=NOW();

INSERT INTO model_configs (id,provider,tier,context_window,max_tokens,cost_per_1k_input,cost_per_1k_output,capabilities,enabled,supports_streaming,supports_functions,supports_vision,description,priority,status,display_name) VALUES
  ('openai-gpt-4o-mini','openai',0,128000,4096,0.00015,0.00060,'{"latency":"low","quality":"high"}'::jsonb,true,true,true,true,'Default assistant model',10,'active','GPT-4o mini'),
  ('openai-gpt-4.1','openai',1,256000,8192,0.00200,0.00800,'{"latency":"medium","quality":"very_high"}'::jsonb,true,true,true,true,'Deep RCA model',20,'active','GPT-4.1'),
  ('anthropic-claude-3-7-sonnet','anthropic',1,200000,8192,0.00300,0.01500,'{"latency":"medium","quality":"high"}'::jsonb,true,true,true,false,'Fallback policy model',30,'active','Claude 3.7 Sonnet')
ON CONFLICT (id) DO UPDATE SET provider=EXCLUDED.provider,tier=EXCLUDED.tier,context_window=EXCLUDED.context_window,max_tokens=EXCLUDED.max_tokens,cost_per_1k_input=EXCLUDED.cost_per_1k_input,cost_per_1k_output=EXCLUDED.cost_per_1k_output,capabilities=EXCLUDED.capabilities,enabled=EXCLUDED.enabled,supports_streaming=EXCLUDED.supports_streaming,supports_functions=EXCLUDED.supports_functions,supports_vision=EXCLUDED.supports_vision,description=EXCLUDED.description,priority=EXCLUDED.priority,status=EXCLUDED.status,display_name=EXCLUDED.display_name,updated_at=NOW();

INSERT INTO orchestration_rules (id,name,description,strategy,model_sequence,conditions,enabled,priority,metadata) VALUES
  ('99000000-2000-0000-0000-000000000001','Critical Incident Escalation','Use fast model first then escalate for high severity','tiered_fallback','[{"model":"openai-gpt-4o-mini","maxAttempts":1},{"model":"openai-gpt-4.1","maxAttempts":1}]'::jsonb,'{"modules":["netops","cmdb"],"severity":["high","critical"]}'::jsonb,true,90,'{"owner":"NOC"}'::jsonb),
  ('99000000-2000-0000-0000-000000000002','Cost-Aware Service Desk','Use economical path for normal tickets','cost_optimize','[{"model":"openai-gpt-4o-mini","maxAttempts":1},{"model":"anthropic-claude-3-7-sonnet","maxAttempts":1}]'::jsonb,'{"modules":["requests","asset"],"priority":["low","normal"]}'::jsonb,true,60,'{"owner":"ServiceDesk"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,strategy=EXCLUDED.strategy,model_sequence=EXCLUDED.model_sequence,conditions=EXCLUDED.conditions,enabled=EXCLUDED.enabled,priority=EXCLUDED.priority,metadata=EXCLUDED.metadata,updated_at=NOW();

INSERT INTO usage_logs (id,user_id,model_id,tier,prompt_tokens,completion_tokens,total_tokens,total_cost,quality_score,escalated) VALUES
  ('99000000-2100-0000-0000-000000000001',COALESCE((SELECT id::text FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1),'ops.manager@netopsai.com'),'openai-gpt-4o-mini',0,920,510,1430,0.00134,0.91,false),
  ('99000000-2100-0000-0000-000000000002',COALESCE((SELECT id::text FROM users WHERE email='cmdb.owner@netopsai.com' LIMIT 1),'cmdb.owner@netopsai.com'),'openai-gpt-4.1',1,2100,1300,3400,0.01480,0.97,true)
ON CONFLICT (id) DO UPDATE SET user_id=EXCLUDED.user_id,model_id=EXCLUDED.model_id,tier=EXCLUDED.tier,prompt_tokens=EXCLUDED.prompt_tokens,completion_tokens=EXCLUDED.completion_tokens,total_tokens=EXCLUDED.total_tokens,total_cost=EXCLUDED.total_cost,quality_score=EXCLUDED.quality_score,escalated=EXCLUDED.escalated;

INSERT INTO provider_usage_history (provider,usage_date,total_tokens,total_cost,credits_used) VALUES
  ('openai',CURRENT_DATE-1,220000,241.30,0),('anthropic',CURRENT_DATE-1,74000,88.40,0)
ON CONFLICT (provider,usage_date) DO UPDATE SET total_tokens=EXCLUDED.total_tokens,total_cost=EXCLUDED.total_cost,credits_used=EXCLUDED.credits_used;
INSERT INTO model_usage_history (model,usage_date,total_tokens,total_cost,message_count) VALUES
  ('openai-gpt-4o-mini',CURRENT_DATE-1,158000,104.80,1340),('openai-gpt-4.1',CURRENT_DATE-1,62000,112.90,410)
ON CONFLICT (model,usage_date) DO UPDATE SET total_tokens=EXCLUDED.total_tokens,total_cost=EXCLUDED.total_cost,message_count=EXCLUDED.message_count;
INSERT INTO model_performance (model,provider,date,total_requests,successful_requests,failed_requests,avg_latency_ms,avg_tokens_per_request,total_cost,quality_score) VALUES
  ('openai-gpt-4o-mini','openai',CURRENT_DATE-1,1320,1304,16,790.20,120.80,104.80,0.93),
  ('openai-gpt-4.1','openai',CURRENT_DATE-1,412,404,8,1430.60,150.50,112.90,0.97)
ON CONFLICT (model,provider,date) DO UPDATE SET total_requests=EXCLUDED.total_requests,successful_requests=EXCLUDED.successful_requests,failed_requests=EXCLUDED.failed_requests,avg_latency_ms=EXCLUDED.avg_latency_ms,avg_tokens_per_request=EXCLUDED.avg_tokens_per_request,total_cost=EXCLUDED.total_cost,quality_score=EXCLUDED.quality_score;
INSERT INTO user_token_stats (user_id,date,model,provider,total_tokens,total_cost,message_count,conversation_count) VALUES
  (COALESCE((SELECT id::text FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1),'ops.manager@netopsai.com'),CURRENT_DATE-1,'openai-gpt-4o-mini','openai',38200,24.30,176,24)
ON CONFLICT (user_id,date,model,provider) DO UPDATE SET total_tokens=EXCLUDED.total_tokens,total_cost=EXCLUDED.total_cost,message_count=EXCLUDED.message_count,conversation_count=EXCLUDED.conversation_count;

INSERT INTO conversations (id,user_id,title,model,status,message_count,metadata) VALUES
  ('99100000-0000-0000-0000-000000000001',COALESCE((SELECT id::text FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1),'ops.manager@netopsai.com'),'Core Switch Packet Loss RCA','openai-gpt-4.1','active',2,'{"module":"netops","ticket":"INC-2026-0315"}'::jsonb),
  ('99100000-0000-0000-0000-000000000002',COALESCE((SELECT id::text FROM users WHERE email='cmdb.owner@netopsai.com' LIMIT 1),'cmdb.owner@netopsai.com'),'CMDB Dependency Review','openai-gpt-4o-mini','active',2,'{"module":"cmdb"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET user_id=EXCLUDED.user_id,title=EXCLUDED.title,model=EXCLUDED.model,status=EXCLUDED.status,message_count=EXCLUDED.message_count,metadata=EXCLUDED.metadata,updated_at=NOW();
INSERT INTO messages (id,conversation_id,role,content,model,provider,prompt_tokens,completion_tokens,cost,latency_ms,metadata,token_count) VALUES
  ('99100000-1000-0000-0000-000000000001','99100000-0000-0000-0000-000000000001','user','Packet loss 18% on core uplink. Need RCA path.','openai-gpt-4.1','openai',260,0,0,NULL,'{}'::jsonb,260),
  ('99100000-1000-0000-0000-000000000002','99100000-0000-0000-0000-000000000001','assistant','Check CRC, queue drops, optic DOM, and STP flaps first.','openai-gpt-4.1','openai',0,180,0.0054,1320,'{}'::jsonb,180)
ON CONFLICT (id) DO UPDATE SET conversation_id=EXCLUDED.conversation_id,role=EXCLUDED.role,content=EXCLUDED.content,model=EXCLUDED.model,provider=EXCLUDED.provider,prompt_tokens=EXCLUDED.prompt_tokens,completion_tokens=EXCLUDED.completion_tokens,cost=EXCLUDED.cost,latency_ms=EXCLUDED.latency_ms,metadata=EXCLUDED.metadata,token_count=EXCLUDED.token_count;
INSERT INTO chat_contexts (id,conversation_id,context_type,content,tokens,priority,metadata) VALUES
  ('99100000-2000-0000-0000-000000000001','99100000-0000-0000-0000-000000000001','session','INC-2026-0315 on sw-core-01 uplink Gi1/0/49',90,20,'{"site":"HQ-DC"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET content=EXCLUDED.content,tokens=EXCLUDED.tokens,priority=EXCLUDED.priority,metadata=EXCLUDED.metadata,updated_at=NOW();
INSERT INTO conversation_token_usage (id,conversation_id,model,provider,prompt_tokens,completion_tokens,total_tokens,cost,message_count) VALUES
  ('99100000-3000-0000-0000-000000000001','99100000-0000-0000-0000-000000000001','openai-gpt-4.1','openai',260,180,440,0.0054,2)
ON CONFLICT (id) DO UPDATE SET prompt_tokens=EXCLUDED.prompt_tokens,completion_tokens=EXCLUDED.completion_tokens,total_tokens=EXCLUDED.total_tokens,cost=EXCLUDED.cost,message_count=EXCLUDED.message_count;
-- Category specs + CMDB schema
INSERT INTO asset_category_spec_versions (id,category_id,version,status,created_by)
SELECT CASE WHEN c.name='Laptop' THEN '99000000-4000-0000-0000-000000000001'::uuid ELSE '99000000-4000-0000-0000-000000000002'::uuid END, c.id, 1, 'active', 'seed-feature-complete'
FROM asset_categories c WHERE c.name IN ('Laptop','Server')
ON CONFLICT (category_id,version) DO UPDATE SET status=EXCLUDED.status, created_by=EXCLUDED.created_by;

INSERT INTO asset_category_spec_definitions (id,spec_version_id,key,label,field_type,unit,required,enum_values,min_value,max_value,step_value,default_value,help_text,sort_order,is_active,is_readonly,is_searchable,is_filterable)
SELECT * FROM (
  SELECT '99000000-4100-0000-0000-000000000001'::uuid,v.id,'cpu','CPU Model','string',NULL::text,true,NULL::jsonb,NULL::numeric,NULL::numeric,NULL::numeric,NULL::jsonb,'Processor family',10,true,false,true,true FROM asset_category_spec_versions v JOIN asset_categories c ON c.id=v.category_id WHERE c.name='Laptop' AND v.version=1
  UNION ALL
  SELECT '99000000-4100-0000-0000-000000000002'::uuid,v.id,'ram_gb','RAM (GB)','number','GB',true,NULL::jsonb,8::numeric,128::numeric,8::numeric,'16'::jsonb,'Installed memory',20,true,false,true,true FROM asset_category_spec_versions v JOIN asset_categories c ON c.id=v.category_id WHERE c.name='Laptop' AND v.version=1
  UNION ALL
  SELECT '99000000-4100-0000-0000-000000000003'::uuid,v.id,'raid_level','RAID Level','enum',NULL::text,true,'["RAID1","RAID5","RAID10"]'::jsonb,NULL::numeric,NULL::numeric,NULL::numeric,'"RAID10"'::jsonb,'Storage resilience',20,true,false,false,true FROM asset_category_spec_versions v JOIN asset_categories c ON c.id=v.category_id WHERE c.name='Server' AND v.version=1
) x(id,spec_version_id,key,label,field_type,unit,required,enum_values,min_value,max_value,step_value,default_value,help_text,sort_order,is_active,is_readonly,is_searchable,is_filterable)
ON CONFLICT (spec_version_id,key) DO UPDATE SET label=EXCLUDED.label, field_type=EXCLUDED.field_type, unit=EXCLUDED.unit, required=EXCLUDED.required, enum_values=EXCLUDED.enum_values, min_value=EXCLUDED.min_value, max_value=EXCLUDED.max_value, step_value=EXCLUDED.step_value, default_value=EXCLUDED.default_value, help_text=EXCLUDED.help_text, sort_order=EXCLUDED.sort_order, is_active=EXCLUDED.is_active, is_readonly=EXCLUDED.is_readonly, is_searchable=EXCLUDED.is_searchable, is_filterable=EXCLUDED.is_filterable, updated_at=NOW();

UPDATE asset_models m SET spec_version_id=v.id FROM asset_category_spec_versions v WHERE m.category_id=v.category_id AND v.version=1 AND v.status='active';

INSERT INTO cmdb_ci_types (id,code,name,description) VALUES
  ('99510000-0000-0000-0000-000000000001','server','Server','Physical or virtual compute node'),
  ('99510000-0000-0000-0000-000000000002','network_device','Network Device','Firewall, router, switch, or load balancer'),
  ('99510000-0000-0000-0000-000000000003','application','Application','Business application or platform service'),
  ('99510000-0000-0000-0000-000000000004','database','Database','Structured data service')
ON CONFLICT (code) DO UPDATE
SET name=EXCLUDED.name, description=EXCLUDED.description;

INSERT INTO cmdb_cis (id,type_id,asset_id,location_id,name,ci_code,status,environment,owner_team,notes,metadata)
SELECT * FROM (
  SELECT '99520000-0000-0000-0000-000000000001'::uuid,t.id,a.id,a.location_id,'Authentication Server 01','CI-SRV-AUTH-01','active','prod','Platform Ops','Primary authentication and SSO backend node','{"hostname":"srv-auth-01","service_tier":"tier1"}'::jsonb FROM cmdb_ci_types t JOIN assets a ON a.asset_code='AST-SRV-0001' WHERE t.code='server'
  UNION ALL
  SELECT '99520000-0000-0000-0000-000000000002'::uuid,t.id,a.id,a.location_id,'HQ Edge Firewall','CI-NET-FW-EDGE-01','active','prod','Network Security','Internet perimeter security gateway at HQ','{"hostname":"fw-edge-hq","vendor":"Fortinet"}'::jsonb FROM cmdb_ci_types t JOIN assets a ON a.asset_code='AST-FW-0001' WHERE t.code='network_device'
  UNION ALL
  SELECT '99520000-0000-0000-0000-000000000003'::uuid,t.id,NULL::uuid,(SELECT location_id FROM assets WHERE asset_code='AST-SRV-0001' LIMIT 1),'ERP Application','CI-APP-ERP-01','active','prod','Business Apps','ERP web application handling procurement and asset workflows','{"app_id":"erp-core","tier":"frontend"}'::jsonb FROM cmdb_ci_types t WHERE t.code='application'
  UNION ALL
  SELECT '99520000-0000-0000-0000-000000000004'::uuid,t.id,NULL::uuid,(SELECT location_id FROM assets WHERE asset_code='AST-SRV-0001' LIMIT 1),'ERP Database Primary','CI-DB-ERP-PRD','active','prod','Database Ops','Primary PostgreSQL database for ERP transactions','{"engine":"postgresql","version":"16"}'::jsonb FROM cmdb_ci_types t WHERE t.code='database'
) x(id,type_id,asset_id,location_id,name,ci_code,status,environment,owner_team,notes,metadata)
ON CONFLICT (ci_code) DO UPDATE
SET type_id=EXCLUDED.type_id,asset_id=EXCLUDED.asset_id,location_id=EXCLUDED.location_id,name=EXCLUDED.name,status=EXCLUDED.status,environment=EXCLUDED.environment,owner_team=EXCLUDED.owner_team,notes=EXCLUDED.notes,metadata=EXCLUDED.metadata,updated_at=NOW();

INSERT INTO cmdb_relationship_types (id,code,name,reverse_name,allowed_from_type_id,allowed_to_type_id)
SELECT * FROM (
  SELECT '99530000-0000-0000-0000-000000000001'::uuid,'runs_on','Runs On','Hosts',f.id,t.id FROM cmdb_ci_types f JOIN cmdb_ci_types t ON f.code='application' AND t.code='server'
  UNION ALL
  SELECT '99530000-0000-0000-0000-000000000002'::uuid,'uses','Uses','Used By',f.id,t.id FROM cmdb_ci_types f JOIN cmdb_ci_types t ON f.code='application' AND t.code='database'
  UNION ALL
  SELECT '99530000-0000-0000-0000-000000000003'::uuid,'protects','Protects','Protected By',f.id,t.id FROM cmdb_ci_types f JOIN cmdb_ci_types t ON f.code='network_device' AND t.code='server'
) x(id,code,name,reverse_name,allowed_from_type_id,allowed_to_type_id)
ON CONFLICT (code) DO UPDATE
SET name=EXCLUDED.name,reverse_name=EXCLUDED.reverse_name,allowed_from_type_id=EXCLUDED.allowed_from_type_id,allowed_to_type_id=EXCLUDED.allowed_to_type_id;

INSERT INTO cmdb_relationships (id,type_id,from_ci_id,to_ci_id,metadata)
SELECT * FROM (
  SELECT '99540000-0000-0000-0000-000000000001'::uuid,rt.id,f.id,t.id,'{"critical_path":true}'::jsonb FROM cmdb_relationship_types rt JOIN cmdb_cis f ON f.ci_code='CI-APP-ERP-01' JOIN cmdb_cis t ON t.ci_code='CI-SRV-AUTH-01' WHERE rt.code='runs_on'
  UNION ALL
  SELECT '99540000-0000-0000-0000-000000000002'::uuid,rt.id,f.id,t.id,'{"data_flow":"read_write"}'::jsonb FROM cmdb_relationship_types rt JOIN cmdb_cis f ON f.ci_code='CI-APP-ERP-01' JOIN cmdb_cis t ON t.ci_code='CI-DB-ERP-PRD' WHERE rt.code='uses'
  UNION ALL
  SELECT '99540000-0000-0000-0000-000000000003'::uuid,rt.id,f.id,t.id,'{"scope":"north_south"}'::jsonb FROM cmdb_relationship_types rt JOIN cmdb_cis f ON f.ci_code='CI-NET-FW-EDGE-01' JOIN cmdb_cis t ON t.ci_code='CI-SRV-AUTH-01' WHERE rt.code='protects'
) x(id,type_id,from_ci_id,to_ci_id,metadata)
ON CONFLICT (type_id,from_ci_id,to_ci_id) DO UPDATE
SET metadata=EXCLUDED.metadata;

INSERT INTO cmdb_services (id,code,name,description,criticality,owner,sla,status,metadata)
VALUES ('99550000-0000-0000-0000-000000000001','SVC-ERP-CORE','ERP Core Service','Core ERP workflows for procurement and asset lifecycle','critical','Business Applications Team','{"availability":"99.9","response":"P1-15m"}'::jsonb,'active','{"business_unit":"Operations"}'::jsonb)
ON CONFLICT (code) DO UPDATE
SET name=EXCLUDED.name,description=EXCLUDED.description,criticality=EXCLUDED.criticality,owner=EXCLUDED.owner,sla=EXCLUDED.sla,status=EXCLUDED.status,metadata=EXCLUDED.metadata,updated_at=NOW();

INSERT INTO cmdb_service_cis (id,service_id,ci_id,dependency_type)
SELECT * FROM (
  SELECT '99560000-0000-0000-0000-000000000001'::uuid,s.id,c.id,'primary'::varchar FROM cmdb_services s JOIN cmdb_cis c ON s.code='SVC-ERP-CORE' AND c.ci_code='CI-APP-ERP-01'
  UNION ALL
  SELECT '99560000-0000-0000-0000-000000000002'::uuid,s.id,c.id,'database'::varchar FROM cmdb_services s JOIN cmdb_cis c ON s.code='SVC-ERP-CORE' AND c.ci_code='CI-DB-ERP-PRD'
  UNION ALL
  SELECT '99560000-0000-0000-0000-000000000003'::uuid,s.id,c.id,'infrastructure'::varchar FROM cmdb_services s JOIN cmdb_cis c ON s.code='SVC-ERP-CORE' AND c.ci_code='CI-SRV-AUTH-01'
) x(id,service_id,ci_id,dependency_type)
ON CONFLICT (service_id,ci_id) DO UPDATE
SET dependency_type=EXCLUDED.dependency_type;

INSERT INTO cmdb_service_members (id,service_id,ci_id,role)
SELECT * FROM (
  SELECT '99561000-0000-0000-0000-000000000001'::uuid,s.id,c.id,'application'::text FROM cmdb_services s JOIN cmdb_cis c ON s.code='SVC-ERP-CORE' AND c.ci_code='CI-APP-ERP-01'
  UNION ALL
  SELECT '99561000-0000-0000-0000-000000000002'::uuid,s.id,c.id,'database'::text FROM cmdb_services s JOIN cmdb_cis c ON s.code='SVC-ERP-CORE' AND c.ci_code='CI-DB-ERP-PRD'
  UNION ALL
  SELECT '99561000-0000-0000-0000-000000000003'::uuid,s.id,c.id,'host'::text FROM cmdb_services s JOIN cmdb_cis c ON s.code='SVC-ERP-CORE' AND c.ci_code='CI-SRV-AUTH-01'
) x(id,service_id,ci_id,role)
ON CONFLICT (id) DO UPDATE
SET service_id=EXCLUDED.service_id,ci_id=EXCLUDED.ci_id,role=EXCLUDED.role;

INSERT INTO cmdb_ci_type_versions (type_id,version,status,created_by)
SELECT t.id,1,'active','seed-feature-complete' FROM cmdb_ci_types t WHERE t.code IN ('server','network_device','application','database')
ON CONFLICT (type_id,version) DO UPDATE
SET status=EXCLUDED.status, created_by=EXCLUDED.created_by;

INSERT INTO cmdb_ci_type_attr_defs (id,version_id,key,label,field_type,required,unit,enum_values,pattern,min_value,max_value,step_value,min_len,max_len,default_value,is_searchable,is_filterable,sort_order,is_active)
SELECT * FROM (
  SELECT '99562000-0000-0000-0000-000000000001'::uuid,v.id,'ip_address','IP Address','ip',true,NULL::text,NULL::jsonb,NULL::text,NULL::numeric,NULL::numeric,NULL::numeric,NULL::int,NULL::int,NULL::jsonb,true,true,10,true FROM cmdb_ci_type_versions v JOIN cmdb_ci_types t ON t.id=v.type_id WHERE t.code='server' AND v.version=1
  UNION ALL
  SELECT '99562000-0000-0000-0000-000000000002'::uuid,v.id,'firmware','Firmware Version','string',true,NULL::text,NULL::jsonb,NULL::text,NULL::numeric,NULL::numeric,NULL::numeric,NULL::int,NULL::int,NULL::jsonb,true,true,20,true FROM cmdb_ci_type_versions v JOIN cmdb_ci_types t ON t.id=v.type_id WHERE t.code='network_device' AND v.version=1
  UNION ALL
  SELECT '99562000-0000-0000-0000-000000000003'::uuid,v.id,'business_owner','Business Owner','string',true,NULL::text,NULL::jsonb,NULL::text,NULL::numeric,NULL::numeric,NULL::numeric,3,120,NULL::jsonb,true,true,10,true FROM cmdb_ci_type_versions v JOIN cmdb_ci_types t ON t.id=v.type_id WHERE t.code='application' AND v.version=1
  UNION ALL
  SELECT '99562000-0000-0000-0000-000000000004'::uuid,v.id,'db_engine','Database Engine','enum',true,NULL::text,'["postgresql","mysql","oracle"]'::jsonb,NULL::text,NULL::numeric,NULL::numeric,NULL::numeric,NULL::int,NULL::int,'"postgresql"'::jsonb,true,true,10,true FROM cmdb_ci_type_versions v JOIN cmdb_ci_types t ON t.id=v.type_id WHERE t.code='database' AND v.version=1
) x(id,version_id,key,label,field_type,required,unit,enum_values,pattern,min_value,max_value,step_value,min_len,max_len,default_value,is_searchable,is_filterable,sort_order,is_active)
ON CONFLICT (version_id,key) DO UPDATE
SET label=EXCLUDED.label,field_type=EXCLUDED.field_type,required=EXCLUDED.required,unit=EXCLUDED.unit,enum_values=EXCLUDED.enum_values,pattern=EXCLUDED.pattern,min_value=EXCLUDED.min_value,max_value=EXCLUDED.max_value,step_value=EXCLUDED.step_value,min_len=EXCLUDED.min_len,max_len=EXCLUDED.max_len,default_value=EXCLUDED.default_value,is_searchable=EXCLUDED.is_searchable,is_filterable=EXCLUDED.is_filterable,sort_order=EXCLUDED.sort_order,is_active=EXCLUDED.is_active,updated_at=NOW();

INSERT INTO cmdb_ci_schemas (id,version_id,attr_key,attr_label,data_type,is_required,is_indexed,default_value,validation_rules,display_order)
SELECT * FROM (
  SELECT '99000000-5000-0000-0000-000000000001'::uuid,v.id,'ip_address','IP Address','text',true,true,NULL::jsonb,'{"pattern":"^([0-9]{1,3}\\.){3}[0-9]{1,3}$"}'::jsonb,10 FROM cmdb_ci_type_versions v JOIN cmdb_ci_types t ON t.id=v.type_id WHERE t.code='server' AND v.version=1
  UNION ALL
  SELECT '99000000-5000-0000-0000-000000000002'::uuid,v.id,'firmware','Firmware','text',true,false,NULL::jsonb,'{}'::jsonb,10 FROM cmdb_ci_type_versions v JOIN cmdb_ci_types t ON t.id=v.type_id WHERE t.code='network_device' AND v.version=1
  UNION ALL
  SELECT '99000000-5000-0000-0000-000000000003'::uuid,v.id,'business_owner','Business Owner','text',true,false,NULL::jsonb,'{"minLength":3}'::jsonb,10 FROM cmdb_ci_type_versions v JOIN cmdb_ci_types t ON t.id=v.type_id WHERE t.code='application' AND v.version=1
  UNION ALL
  SELECT '99000000-5000-0000-0000-000000000004'::uuid,v.id,'db_engine','Database Engine','select',true,false,'"postgresql"'::jsonb,'{"options":["postgresql","mysql","oracle"]}'::jsonb,10 FROM cmdb_ci_type_versions v JOIN cmdb_ci_types t ON t.id=v.type_id WHERE t.code='database' AND v.version=1
) x(id,version_id,attr_key,attr_label,data_type,is_required,is_indexed,default_value,validation_rules,display_order)
ON CONFLICT (version_id,attr_key) DO UPDATE
SET attr_label=EXCLUDED.attr_label,data_type=EXCLUDED.data_type,is_required=EXCLUDED.is_required,is_indexed=EXCLUDED.is_indexed,default_value=EXCLUDED.default_value,validation_rules=EXCLUDED.validation_rules,display_order=EXCLUDED.display_order;

INSERT INTO cmdb_ci_attr_values (id,ci_id,schema_id,attr_key,value)
SELECT '99000000-5200-0000-0000-000000000001'::uuid,c.id,s.id,'ip_address',to_jsonb(COALESCE((a.mgmt_ip)::text,'10.10.0.11'))
FROM cmdb_cis c
JOIN assets a ON a.id=c.asset_id
JOIN cmdb_ci_types t ON t.id=c.type_id AND t.code='server'
JOIN cmdb_ci_type_versions v ON v.type_id=t.id AND v.version=1
JOIN cmdb_ci_schemas s ON s.version_id=v.id AND s.attr_key='ip_address'
WHERE c.ci_code='CI-SRV-AUTH-01'
ON CONFLICT (ci_id,attr_key) DO UPDATE
SET schema_id=EXCLUDED.schema_id, value=EXCLUDED.value, updated_at=NOW();

INSERT INTO cmdb_ci_attr_values (id,ci_id,schema_id,attr_key,value)
SELECT '99000000-5200-0000-0000-000000000002'::uuid,c.id,s.id,'firmware','"FortiOS 7.2.6"'::jsonb
FROM cmdb_cis c
JOIN cmdb_ci_types t ON t.id=c.type_id AND t.code='network_device'
JOIN cmdb_ci_type_versions v ON v.type_id=t.id AND v.version=1
JOIN cmdb_ci_schemas s ON s.version_id=v.id AND s.attr_key='firmware'
WHERE c.ci_code='CI-NET-FW-EDGE-01'
ON CONFLICT (ci_id,attr_key) DO UPDATE
SET schema_id=EXCLUDED.schema_id, value=EXCLUDED.value, updated_at=NOW();

INSERT INTO cmdb_ci_attr_values (id,ci_id,schema_id,attr_key,value)
SELECT '99000000-5200-0000-0000-000000000003'::uuid,c.id,s.id,'business_owner','"Business Applications Team"'::jsonb
FROM cmdb_cis c
JOIN cmdb_ci_types t ON t.id=c.type_id AND t.code='application'
JOIN cmdb_ci_type_versions v ON v.type_id=t.id AND v.version=1
JOIN cmdb_ci_schemas s ON s.version_id=v.id AND s.attr_key='business_owner'
WHERE c.ci_code='CI-APP-ERP-01'
ON CONFLICT (ci_id,attr_key) DO UPDATE
SET schema_id=EXCLUDED.schema_id, value=EXCLUDED.value, updated_at=NOW();

INSERT INTO cmdb_ci_attr_values (id,ci_id,schema_id,attr_key,value)
SELECT '99000000-5200-0000-0000-000000000004'::uuid,c.id,s.id,'db_engine','"postgresql"'::jsonb
FROM cmdb_cis c
JOIN cmdb_ci_types t ON t.id=c.type_id AND t.code='database'
JOIN cmdb_ci_type_versions v ON v.type_id=t.id AND v.version=1
JOIN cmdb_ci_schemas s ON s.version_id=v.id AND s.attr_key='db_engine'
WHERE c.ci_code='CI-DB-ERP-PRD'
ON CONFLICT (ci_id,attr_key) DO UPDATE
SET schema_id=EXCLUDED.schema_id, value=EXCLUDED.value, updated_at=NOW();

INSERT INTO cmdb_ci_attribute_values (id,ci_id,schema_id,attribute_key,value)
SELECT * FROM (
  SELECT '99563000-0000-0000-0000-000000000001'::uuid,c.id,s.id,'ip_address',to_jsonb(COALESCE((a.mgmt_ip)::text,'10.10.0.11')) FROM cmdb_cis c JOIN assets a ON a.id=c.asset_id JOIN cmdb_ci_schemas s ON s.attr_key='ip_address' JOIN cmdb_ci_types t ON t.id=c.type_id AND t.code='server' WHERE c.ci_code='CI-SRV-AUTH-01'
  UNION ALL
  SELECT '99563000-0000-0000-0000-000000000002'::uuid,c.id,s.id,'firmware','"FortiOS 7.2.6"'::jsonb FROM cmdb_cis c JOIN cmdb_ci_schemas s ON s.attr_key='firmware' JOIN cmdb_ci_types t ON t.id=c.type_id AND t.code='network_device' WHERE c.ci_code='CI-NET-FW-EDGE-01'
  UNION ALL
  SELECT '99563000-0000-0000-0000-000000000003'::uuid,c.id,s.id,'business_owner','"Business Applications Team"'::jsonb FROM cmdb_cis c JOIN cmdb_ci_schemas s ON s.attr_key='business_owner' JOIN cmdb_ci_types t ON t.id=c.type_id AND t.code='application' WHERE c.ci_code='CI-APP-ERP-01'
  UNION ALL
  SELECT '99563000-0000-0000-0000-000000000004'::uuid,c.id,s.id,'db_engine','"postgresql"'::jsonb FROM cmdb_cis c JOIN cmdb_ci_schemas s ON s.attr_key='db_engine' JOIN cmdb_ci_types t ON t.id=c.type_id AND t.code='database' WHERE c.ci_code='CI-DB-ERP-PRD'
) x(id,ci_id,schema_id,attribute_key,value)
ON CONFLICT (ci_id,attribute_key) DO UPDATE
SET schema_id=EXCLUDED.schema_id, value=EXCLUDED.value, updated_at=NOW();

INSERT INTO cmdb_discovery_rules (id,name,discovery_type,scope,mapping_rules,is_active,last_status,schedule_cron)
VALUES ('99500000-0000-0000-0000-000000000101','HQ Data Center Discovery','network_scan','[{"cidr":"10.10.0.0/24"}]'::jsonb,'[{"match":"hostname","mapTo":"ci_code"}]'::jsonb,true,'success','0 */6 * * *')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, scope=EXCLUDED.scope, mapping_rules=EXCLUDED.mapping_rules, is_active=EXCLUDED.is_active, last_status=EXCLUDED.last_status, schedule_cron=EXCLUDED.schedule_cron, updated_at=NOW();

INSERT INTO cmdb_discovery_results (id,rule_id,discovered_data,status,confidence,ci_id,reviewed_by,reviewed_at)
SELECT '99500000-1000-0000-0000-000000000101','99500000-0000-0000-0000-000000000101','{"hostname":"srv-auth-01","ip":"10.10.0.11"}'::jsonb,'confirmed',0.96,c.id,'cmdb.owner',NOW()-INTERVAL '1 day'
FROM cmdb_cis c ORDER BY c.created_at LIMIT 1
ON CONFLICT (id) DO UPDATE SET discovered_data=EXCLUDED.discovered_data,status=EXCLUDED.status,confidence=EXCLUDED.confidence,ci_id=EXCLUDED.ci_id,reviewed_by=EXCLUDED.reviewed_by,reviewed_at=EXCLUDED.reviewed_at;

-- Analytics
WITH agg AS (
  SELECT COUNT(*)::int total_assets, COUNT(*) FILTER (WHERE status IN ('in_use','in_stock'))::int active_assets, COUNT(*) FILTER (WHERE status='in_repair')::int in_repair_assets, COUNT(*) FILTER (WHERE status IN ('retired','disposed'))::int disposed_assets, COUNT(*) FILTER (WHERE location_id IS NULL)::int unassigned_assets, COUNT(*) FILTER (WHERE warranty_end BETWEEN CURRENT_DATE AND CURRENT_DATE+30)::int warranty_expiring_30d, COUNT(*) FILTER (WHERE warranty_end<CURRENT_DATE)::int warranty_expired FROM assets
), ticket_agg AS (
  SELECT COUNT(*)::int total_tickets, COUNT(*) FILTER (WHERE status IN ('open','in_progress','waiting_parts'))::int open_tickets, ROUND(AVG(COALESCE(downtime_minutes,0))/60.0,2) avg_repair_hours FROM repair_orders
)
INSERT INTO asset_analytics_snapshots (id,snapshot_date,total_assets,active_assets,in_repair_assets,disposed_assets,unassigned_assets,warranty_expiring_30d,warranty_expired,total_maintenance_tickets,open_tickets,avg_repair_hours,category_breakdown,location_breakdown,vendor_breakdown)
SELECT '99400000-0000-0000-0000-000000000101',CURRENT_DATE-1,agg.total_assets,agg.active_assets,agg.in_repair_assets,agg.disposed_assets,agg.unassigned_assets,agg.warranty_expiring_30d,agg.warranty_expired,ticket_agg.total_tickets,ticket_agg.open_tickets,ticket_agg.avg_repair_hours,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb
FROM agg,ticket_agg
ON CONFLICT (snapshot_date) DO UPDATE SET total_assets=EXCLUDED.total_assets,active_assets=EXCLUDED.active_assets,in_repair_assets=EXCLUDED.in_repair_assets,disposed_assets=EXCLUDED.disposed_assets,unassigned_assets=EXCLUDED.unassigned_assets,warranty_expiring_30d=EXCLUDED.warranty_expiring_30d,warranty_expired=EXCLUDED.warranty_expired,total_maintenance_tickets=EXCLUDED.total_maintenance_tickets,open_tickets=EXCLUDED.open_tickets,avg_repair_hours=EXCLUDED.avg_repair_hours,category_breakdown=EXCLUDED.category_breakdown,location_breakdown=EXCLUDED.location_breakdown,vendor_breakdown=EXCLUDED.vendor_breakdown;

INSERT INTO asset_cost_records (id,asset_id,cost_type,amount,currency,description,recorded_date,recorded_by)
SELECT * FROM (
  SELECT '99400000-1000-0000-0000-000000000001'::uuid,a.id,'purchase'::varchar,2350.00,'USD','Initial purchase of executive laptop',CURRENT_DATE-360,'finance.bot' FROM assets a WHERE a.asset_code='AST-LAP-0001'
  UNION ALL
  SELECT '99400000-1000-0000-0000-000000000002'::uuid,a.id,'maintenance'::varchar,240.00,'USD','Quarterly maintenance for firewall',CURRENT_DATE-14,'noc.user' FROM assets a WHERE a.asset_code='AST-FW-0001'
) x(id,asset_id,cost_type,amount,currency,description,recorded_date,recorded_by)
ON CONFLICT (id) DO UPDATE SET cost_type=EXCLUDED.cost_type,amount=EXCLUDED.amount,currency=EXCLUDED.currency,description=EXCLUDED.description,recorded_date=EXCLUDED.recorded_date,recorded_by=EXCLUDED.recorded_by;

INSERT INTO asset_performance_metrics (id,asset_id,metric_type,metric_value,unit,recorded_at,metadata)
SELECT * FROM (
  SELECT '99400000-2000-0000-0000-000000000001'::uuid,a.id,'uptime'::varchar,99.92,'percent',NOW()-INTERVAL '1 day','{"window":"30d"}'::jsonb FROM assets a WHERE a.asset_code='AST-SRV-0001'
  UNION ALL
  SELECT '99400000-2000-0000-0000-000000000002'::uuid,a.id,'error_rate'::varchar,1.80,'percent',NOW()-INTERVAL '1 day','{"interface":"wan1"}'::jsonb FROM assets a WHERE a.asset_code='AST-FW-0001'
) x(id,asset_id,metric_type,metric_value,unit,recorded_at,metadata)
ON CONFLICT (id) DO UPDATE SET metric_type=EXCLUDED.metric_type,metric_value=EXCLUDED.metric_value,unit=EXCLUDED.unit,recorded_at=EXCLUDED.recorded_at,metadata=EXCLUDED.metadata;

INSERT INTO dashboard_configs (id,user_id,name,layout,widgets,is_default)
VALUES ('99400000-3000-0000-0000-000000000001',COALESCE((SELECT id::text FROM users WHERE email='admin@example.com' LIMIT 1),'admin@example.com'),'Operations Command Center','[{"i":"assetHealth","x":0,"y":0,"w":6,"h":3}]'::jsonb,'["assetHealth","openTickets","compliance"]'::jsonb,true)
ON CONFLICT (id) DO UPDATE SET user_id=EXCLUDED.user_id,name=EXCLUDED.name,layout=EXCLUDED.layout,widgets=EXCLUDED.widgets,is_default=EXCLUDED.is_default,updated_at=NOW();

-- Integrations
INSERT INTO integration_connectors (id,name,provider,config,credentials_ref,is_active,health_status,last_health_check,created_by) VALUES
  ('99600000-0000-0000-0000-000000000101','ServiceNow ITSM (Production)','servicenow','{"instance":"acme.service-now.com","table":"incident"}'::jsonb,'vault://integrations/servicenow/prod',true,'healthy',NOW()-INTERVAL '10 minutes','ops.manager'),
  ('99600000-0000-0000-0000-000000000102','Jira Service Management','jira','{"baseUrl":"https://jira.acme.com","projectKey":"NOC"}'::jsonb,'vault://integrations/jira/prod',true,'degraded',NOW()-INTERVAL '35 minutes','ops.manager')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,provider=EXCLUDED.provider,config=EXCLUDED.config,credentials_ref=EXCLUDED.credentials_ref,is_active=EXCLUDED.is_active,health_status=EXCLUDED.health_status,last_health_check=EXCLUDED.last_health_check,created_by=EXCLUDED.created_by,updated_at=NOW();

INSERT INTO integration_sync_rules (id,connector_id,name,direction,entity_type,field_mappings,filter_conditions,schedule_cron,is_active,last_sync_at,last_sync_status,last_sync_count) VALUES
  ('99600000-1000-0000-0000-000000000101','99600000-0000-0000-0000-000000000101','Import high-priority incidents from ServiceNow','inbound','incident','[{"source":"number","target":"external_ticket"}]'::jsonb,'{"priority":["1","2"]}'::jsonb,'*/15 * * * *',true,NOW()-INTERVAL '16 minutes','success',14),
  ('99600000-1000-0000-0000-000000000102','99600000-0000-0000-0000-000000000102','Push completed changes to Jira','outbound','change_request','[{"source":"id","target":"customfield_change_id"}]'::jsonb,'{"status":["completed"]}'::jsonb,'0 * * * *',true,NOW()-INTERVAL '1 hour','partial',3)
ON CONFLICT (id) DO UPDATE SET connector_id=EXCLUDED.connector_id,name=EXCLUDED.name,direction=EXCLUDED.direction,entity_type=EXCLUDED.entity_type,field_mappings=EXCLUDED.field_mappings,filter_conditions=EXCLUDED.filter_conditions,schedule_cron=EXCLUDED.schedule_cron,is_active=EXCLUDED.is_active,last_sync_at=EXCLUDED.last_sync_at,last_sync_status=EXCLUDED.last_sync_status,last_sync_count=EXCLUDED.last_sync_count,updated_at=NOW();

INSERT INTO integration_sync_logs (id,sync_rule_id,direction,records_processed,records_created,records_updated,records_failed,errors,started_at,completed_at,status) VALUES
  ('99600000-1500-0000-0000-000000000101','99600000-1000-0000-0000-000000000101','inbound',14,4,10,0,'[]'::jsonb,NOW()-INTERVAL '16 minutes',NOW()-INTERVAL '15 minutes','completed'),
  ('99600000-1500-0000-0000-000000000102','99600000-1000-0000-0000-000000000102','outbound',5,0,3,2,'[{"issue":"Missing assignee on Jira ticket NOC-824"}]'::jsonb,NOW()-INTERVAL '1 hour',NOW()-INTERVAL '55 minutes','completed')
ON CONFLICT (id) DO UPDATE SET sync_rule_id=EXCLUDED.sync_rule_id,direction=EXCLUDED.direction,records_processed=EXCLUDED.records_processed,records_created=EXCLUDED.records_created,records_updated=EXCLUDED.records_updated,records_failed=EXCLUDED.records_failed,errors=EXCLUDED.errors,started_at=EXCLUDED.started_at,completed_at=EXCLUDED.completed_at,status=EXCLUDED.status;

INSERT INTO integration_webhooks (id,connector_id,name,url,secret,events,is_active,last_triggered_at,failure_count) VALUES
  ('99600000-2000-0000-0000-000000000101','99600000-0000-0000-0000-000000000101','ServiceNow Incident Events','https://hooks.acme.local/integrations/servicenow/incidents','whsec_sn_2026_prod',ARRAY['incident.created','incident.updated'],true,NOW()-INTERVAL '20 minutes',0)
ON CONFLICT (id) DO UPDATE SET connector_id=EXCLUDED.connector_id,name=EXCLUDED.name,url=EXCLUDED.url,secret=EXCLUDED.secret,events=EXCLUDED.events,is_active=EXCLUDED.is_active,last_triggered_at=EXCLUDED.last_triggered_at,failure_count=EXCLUDED.failure_count;

-- Automation
INSERT INTO workflow_automation_rules (id,name,description,trigger_type,trigger_config,conditions,actions,is_active,priority,created_by) VALUES
  ('99300000-0000-0000-0000-000000000001','Escalate Critical Asset Status Changes','Notify NOC when critical assets move to repair or lost state','status_change','{"entity":"asset"}'::jsonb,'[{"field":"status","operator":"equals","value":"in_repair"}]'::jsonb,'[{"type":"notify","config":{"channel":"ui","title":"Critical asset status changed","userId":"admin@example.com"}}]'::jsonb,true,90,'ops.manager'),
  ('99300000-0000-0000-0000-000000000002','Warranty Expiry Reminder','Notify procurement 30 days before warranty expiry','warranty_expiring','{"daysBefore":30}'::jsonb,'[{"field":"category","operator":"equals","value":"Laptop"}]'::jsonb,'[{"type":"notify","config":{"channel":"ui","title":"Warranty expiry coming up","userId":"ops.manager@netopsai.com"}}]'::jsonb,true,70,'ops.manager')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,trigger_type=EXCLUDED.trigger_type,trigger_config=EXCLUDED.trigger_config,conditions=EXCLUDED.conditions,actions=EXCLUDED.actions,is_active=EXCLUDED.is_active,priority=EXCLUDED.priority,created_by=EXCLUDED.created_by,updated_at=NOW();

INSERT INTO workflow_automation_logs (id,rule_id,trigger_event,actions_executed,status,error_message,started_at,completed_at,correlation_id) VALUES
  ('99300000-1000-0000-0000-000000000001','99300000-0000-0000-0000-000000000001','{"assetCode":"AST-FW-0001","status":"in_repair"}'::jsonb,'[{"type":"notify","result":"sent"}]'::jsonb,'completed',NULL,NOW()-INTERVAL '3 hours',NOW()-INTERVAL '3 hours'+INTERVAL '12 seconds','auto-evt-20260303-001'),
  ('99300000-1000-0000-0000-000000000002','99300000-0000-0000-0000-000000000002','{"assetCode":"AST-LAP-0001","warrantyEnd":"2026-04-02"}'::jsonb,'[]'::jsonb,'failed','Notification endpoint temporarily unavailable',NOW()-INTERVAL '2 hours',NOW()-INTERVAL '2 hours'+INTERVAL '8 seconds','auto-evt-20260303-002')
ON CONFLICT (id) DO UPDATE SET rule_id=EXCLUDED.rule_id,trigger_event=EXCLUDED.trigger_event,actions_executed=EXCLUDED.actions_executed,status=EXCLUDED.status,error_message=EXCLUDED.error_message,started_at=EXCLUDED.started_at,completed_at=EXCLUDED.completed_at,correlation_id=EXCLUDED.correlation_id;

INSERT INTO notification_rules (id,name,event_type,channel,recipients,template,is_active) VALUES
  ('99300000-2000-0000-0000-000000000001','Critical Asset Alert Rule','status_changed','ui','["admin@example.com","ops.manager@netopsai.com"]'::jsonb,'Asset {{assetCode}} changed status to {{status}}',true),
  ('99300000-2000-0000-0000-000000000002','Warranty Reminder Rule','warranty_expiring','email','["procurement@netopsai.com"]'::jsonb,'Warranty for {{assetCode}} expires on {{warrantyEnd}}',true)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,event_type=EXCLUDED.event_type,channel=EXCLUDED.channel,recipients=EXCLUDED.recipients,template=EXCLUDED.template,is_active=EXCLUDED.is_active,updated_at=NOW();

INSERT INTO notifications (id,rule_id,user_id,title,body,channel,status,metadata,created_at,read_at,sent_at)
SELECT * FROM (
  SELECT '99300000-3000-0000-0000-000000000001'::uuid,'99300000-2000-0000-0000-000000000001'::uuid,u.id::text,'Firewall repair alert','Asset AST-FW-0001 entered in_repair state and requires follow-up.','ui','sent','{"assetCode":"AST-FW-0001","severity":"high"}'::jsonb,NOW()-INTERVAL '4 hours',NULL::timestamptz,NOW()-INTERVAL '4 hours' FROM users u WHERE u.email='admin@example.com'
  UNION ALL
  SELECT '99300000-3000-0000-0000-000000000002'::uuid,'99300000-2000-0000-0000-000000000002'::uuid,u.id::text,'Warranty expiry in 30 days','Laptop AST-LAP-0001 warranty will expire soon. Plan renewal or replacement.','email','pending','{"assetCode":"AST-LAP-0001","daysBefore":30}'::jsonb,NOW()-INTERVAL '1 day',NULL::timestamptz,NULL::timestamptz FROM users u WHERE u.email='ops.manager@netopsai.com'
) x(id,rule_id,user_id,title,body,channel,status,metadata,created_at,read_at,sent_at)
ON CONFLICT (id) DO UPDATE SET rule_id=EXCLUDED.rule_id,user_id=EXCLUDED.user_id,title=EXCLUDED.title,body=EXCLUDED.body,channel=EXCLUDED.channel,status=EXCLUDED.status,metadata=EXCLUDED.metadata,created_at=EXCLUDED.created_at,read_at=EXCLUDED.read_at,sent_at=EXCLUDED.sent_at;

INSERT INTO scheduled_tasks (id,name,task_type,cron_expression,config,is_active,last_run_at,next_run_at,last_status) VALUES
  ('99300000-4000-0000-0000-000000000001','Daily Warranty Scan','warranty_check','0 8 * * *','{"windowDays":30}'::jsonb,true,NOW()-INTERVAL '1 day',NOW()+INTERVAL '8 hours','success'),
  ('99300000-4000-0000-0000-000000000002','Weekly Maintenance Reminder','maintenance_reminder','0 9 * * 1','{"channels":["ui","email"]}'::jsonb,true,NOW()-INTERVAL '2 days',NOW()+INTERVAL '5 days','success')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,task_type=EXCLUDED.task_type,cron_expression=EXCLUDED.cron_expression,config=EXCLUDED.config,is_active=EXCLUDED.is_active,last_run_at=EXCLUDED.last_run_at,next_run_at=EXCLUDED.next_run_at,last_status=EXCLUDED.last_status,updated_at=NOW();

-- Security & compliance
INSERT INTO rbac_roles (id,key,name,description,is_system) VALUES
  ('99710000-0000-0000-0000-000000000001','super_admin','Super Admin','Platform super administrator',true),
  ('99710000-0000-0000-0000-000000000002','admin','Administrator','Operations administrator',true),
  ('99710000-0000-0000-0000-000000000003','it_asset_manager','IT Asset Manager','Asset and CMDB operations manager',true),
  ('99710000-0000-0000-0000-000000000004','technician','Technician','Support technician',true)
ON CONFLICT (key) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,is_system=EXCLUDED.is_system,updated_at=NOW();

INSERT INTO rbac_permissions (id,code,name,description,module,action) VALUES
  ('99711000-0000-0000-0000-000000000001','security.permissions.read','View security permissions','Allow viewing RBAC permission catalog','security','read'),
  ('99711000-0000-0000-0000-000000000002','security.permissions.update','Manage role permissions','Allow assigning/removing permissions','security','update'),
  ('99711000-0000-0000-0000-000000000003','cmdb.ci.read','View CMDB configuration items','Allow reading CI inventory and topology','cmdb','read'),
  ('99711000-0000-0000-0000-000000000004','cmdb.ci.update','Update CMDB configuration items','Allow updating CI metadata and attributes','cmdb','update'),
  ('99711000-0000-0000-0000-000000000005','automation.rules.manage','Manage automation rules','Allow creating and maintaining automation rules','automation','create'),
  ('99711000-0000-0000-0000-000000000006','reports.export','Export compliance and asset reports','Allow exporting reports for audits','reports','export')
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,module=EXCLUDED.module,action=EXCLUDED.action;

INSERT INTO rbac_role_permissions (role,permission_id,granted_by)
SELECT * FROM (
  SELECT 'super_admin'::varchar,p.id,'seed-feature-complete' FROM rbac_permissions p
  UNION ALL
  SELECT 'admin'::varchar,p.id,'seed-feature-complete' FROM rbac_permissions p WHERE p.code IN ('security.permissions.read','cmdb.ci.read','cmdb.ci.update','automation.rules.manage','reports.export')
  UNION ALL
  SELECT 'it_asset_manager'::varchar,p.id,'seed-feature-complete' FROM rbac_permissions p WHERE p.code IN ('cmdb.ci.read','cmdb.ci.update','automation.rules.manage')
  UNION ALL
  SELECT 'technician'::varchar,p.id,'seed-feature-complete' FROM rbac_permissions p WHERE p.code IN ('cmdb.ci.read')
) x(role,permission_id,granted_by)
ON CONFLICT (role,permission_id) DO UPDATE SET granted_by=EXCLUDED.granted_by,granted_at=NOW();

INSERT INTO compliance_frameworks (code,name,description,version,is_active) VALUES
  ('ISO27001','ISO/IEC 27001','Information Security Management controls','2022',true),
  ('NIST-CSF','NIST Cybersecurity Framework','Cybersecurity baseline controls','2.0',true)
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,version=EXCLUDED.version,is_active=EXCLUDED.is_active;

INSERT INTO compliance_controls (id,framework_id,control_code,title,description,category,check_type,check_query,severity)
SELECT * FROM (
  SELECT '99700000-1000-0000-0000-000000000001'::uuid,f.id,'A.8.1','Asset Inventory Accuracy','Production assets must be inventoried and mapped to owners.','Asset Management','automated','SELECT COUNT(*) FROM assets','high' FROM compliance_frameworks f WHERE f.code='ISO27001'
  UNION ALL
  SELECT '99700000-1000-0000-0000-000000000002'::uuid,f.id,'PR.AC-1','Least Privilege Enforcement','Access should be least-privilege with periodic review.','Access Control','manual',NULL,'critical' FROM compliance_frameworks f WHERE f.code='NIST-CSF'
) x(id,framework_id,control_code,title,description,category,check_type,check_query,severity)
ON CONFLICT (id) DO UPDATE SET framework_id=EXCLUDED.framework_id,control_code=EXCLUDED.control_code,title=EXCLUDED.title,description=EXCLUDED.description,category=EXCLUDED.category,check_type=EXCLUDED.check_type,check_query=EXCLUDED.check_query,severity=EXCLUDED.severity;

INSERT INTO compliance_assessments (id,framework_id,assessment_date,total_controls,passed_controls,failed_controls,not_applicable,score,status,assessed_by,results)
SELECT '99700000-2000-0000-0000-000000000001',f.id,CURRENT_DATE-2,24,20,3,1,83.33,'completed','security.lead','[{"control":"A.8.1","status":"pass"},{"control":"A.12.6","status":"fail"}]'::jsonb
FROM compliance_frameworks f WHERE f.code='ISO27001'
ON CONFLICT (id) DO UPDATE SET framework_id=EXCLUDED.framework_id,assessment_date=EXCLUDED.assessment_date,total_controls=EXCLUDED.total_controls,passed_controls=EXCLUDED.passed_controls,failed_controls=EXCLUDED.failed_controls,not_applicable=EXCLUDED.not_applicable,score=EXCLUDED.score,status=EXCLUDED.status,assessed_by=EXCLUDED.assessed_by,results=EXCLUDED.results;

INSERT INTO security_audit_logs (id,user_id,action,resource_type,resource_id,ip_address,user_agent,details,risk_level,created_at) VALUES
  ('99700000-3000-0000-0000-000000000001',COALESCE((SELECT id::text FROM users WHERE email='security.lead@netopsai.com' LIMIT 1),'security.lead@netopsai.com'),'rbac.role.permissions_updated','rbac_role','network_operator','10.10.20.15','Mozilla/5.0','{"change":"added topology.read"}'::jsonb,'medium',NOW()-INTERVAL '3 days'),
  ('99700000-3000-0000-0000-000000000002',COALESCE((SELECT id::text FROM users WHERE email='admin@example.com' LIMIT 1),'admin@example.com'),'auth.failed_login','user','ops.manager@netopsai.com','203.113.10.44','curl/8.4.0','{"reason":"invalid_password"}'::jsonb,'high',NOW()-INTERVAL '2 days')
ON CONFLICT (id) DO UPDATE SET action=EXCLUDED.action,resource_type=EXCLUDED.resource_type,resource_id=EXCLUDED.resource_id,ip_address=EXCLUDED.ip_address,user_agent=EXCLUDED.user_agent,details=EXCLUDED.details,risk_level=EXCLUDED.risk_level,created_at=EXCLUDED.created_at;

-- Requests
INSERT INTO asset_requests (id,request_code,request_type,requester_id,department_id,asset_category_id,asset_model_id,quantity,current_asset_id,justification,priority,required_date,status,approval_chain,total_approval_steps,current_approval_step,submitted_at,organization_id,created_by)
SELECT * FROM (
  SELECT '99800000-1000-0000-0000-000000000001'::uuid,'REQ-2026-0001','new',u.id,(SELECT id FROM org_units ORDER BY created_at LIMIT 1),c.id,m.id,2,NULL::uuid,'Onboarding plan for Q2 requires two additional laptops for NOC shift expansion.','high',CURRENT_DATE+10,'pending_approval','[{"step":1,"role":"department_head"},{"step":2,"role":"asset_manager"}]'::jsonb,2,1,NOW()-INTERVAL '1 day','99000000-7000-0000-0000-000000000001'::uuid,u.id
  FROM users u JOIN asset_categories c ON c.name='Laptop' JOIN asset_models m ON m.category_id=c.id WHERE u.email='ops.manager@netopsai.com' ORDER BY m.created_at LIMIT 1
) x(id,request_code,request_type,requester_id,department_id,asset_category_id,asset_model_id,quantity,current_asset_id,justification,priority,required_date,status,approval_chain,total_approval_steps,current_approval_step,submitted_at,organization_id,created_by)
ON CONFLICT (request_code) DO UPDATE SET request_type=EXCLUDED.request_type,requester_id=EXCLUDED.requester_id,department_id=EXCLUDED.department_id,asset_category_id=EXCLUDED.asset_category_id,asset_model_id=EXCLUDED.asset_model_id,quantity=EXCLUDED.quantity,current_asset_id=EXCLUDED.current_asset_id,justification=EXCLUDED.justification,priority=EXCLUDED.priority,required_date=EXCLUDED.required_date,status=EXCLUDED.status,approval_chain=EXCLUDED.approval_chain,total_approval_steps=EXCLUDED.total_approval_steps,current_approval_step=EXCLUDED.current_approval_step,submitted_at=EXCLUDED.submitted_at,organization_id=EXCLUDED.organization_id,created_by=EXCLUDED.created_by,updated_at=NOW();

INSERT INTO request_comments (id,request_id,comment_type,content,author_id,created_at)
SELECT '99800000-2000-0000-0000-000000000001',r.id,'comment','Need approval before Friday procurement cutoff.',u.id,NOW()-INTERVAL '22 hours'
FROM asset_requests r JOIN users u ON u.email='ops.manager@netopsai.com' WHERE r.request_code='REQ-2026-0001'
ON CONFLICT (id) DO UPDATE SET comment_type=EXCLUDED.comment_type,content=EXCLUDED.content,author_id=EXCLUDED.author_id,created_at=EXCLUDED.created_at;

INSERT INTO request_audit_logs (id,request_id,event_type,actor_id,old_status,new_status,metadata,created_at)
SELECT '99800000-3000-0000-0000-000000000001',r.id,'status_changed',u.id,'draft','pending_approval','{"reason":"submitted"}'::jsonb,NOW()-INTERVAL '1 day'
FROM asset_requests r JOIN users u ON u.email='ops.manager@netopsai.com' WHERE r.request_code='REQ-2026-0001'
ON CONFLICT (id) DO UPDATE SET event_type=EXCLUDED.event_type,actor_id=EXCLUDED.actor_id,old_status=EXCLUDED.old_status,new_status=EXCLUDED.new_status,metadata=EXCLUDED.metadata,created_at=EXCLUDED.created_at;

INSERT INTO request_attachments (id,request_id,file_name,file_path,file_size,file_type,uploaded_by,uploaded_at,description)
SELECT '99800000-4000-0000-0000-000000000001',r.id,'onboarding-headcount-q2.pdf','requests/REQ-2026-0001/onboarding-headcount-q2.pdf',248320,'application/pdf',u.id,NOW()-INTERVAL '23 hours','Headcount approval sheet attached by requester'
FROM asset_requests r JOIN users u ON u.email='ops.manager@netopsai.com' WHERE r.request_code='REQ-2026-0001'
ON CONFLICT (id) DO UPDATE SET file_name=EXCLUDED.file_name,file_path=EXCLUDED.file_path,file_size=EXCLUDED.file_size,file_type=EXCLUDED.file_type,uploaded_by=EXCLUDED.uploaded_by,uploaded_at=EXCLUDED.uploaded_at,description=EXCLUDED.description;

-- Warehouse lots/movements + messaging
INSERT INTO organizations (id,name) VALUES ('99000000-7000-0000-0000-000000000001','NetOpsAI Operations') ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name;
INSERT INTO warehouses (id,code,name,location_id)
VALUES ('99000000-7000-0000-0000-000000000011','WH-HQ-01','HQ Spare Parts Warehouse',(SELECT id FROM locations WHERE name ILIKE '%HQ%' ORDER BY created_at LIMIT 1))
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, location_id=EXCLUDED.location_id;
INSERT INTO spare_parts (id,part_code,name,category,uom,manufacturer,model,spec,min_level) VALUES
  ('99000000-6000-0000-0000-000000000001','SP-GBIC-SX','SFP SX 1G Transceiver','Optics','pcs','Cisco','GLC-SX-MMD','{"distance":"550m"}'::jsonb,10),
  ('99000000-6000-0000-0000-000000000003','SP-FAN-FG100F','Fan Module FG100F','Firewall Parts','pcs','Fortinet','FG100F-FAN','{"hot_swap":true}'::jsonb,6)
ON CONFLICT (part_code) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,manufacturer=EXCLUDED.manufacturer,model=EXCLUDED.model,spec=EXCLUDED.spec,min_level=EXCLUDED.min_level;
INSERT INTO spare_part_stock (id,warehouse_id,part_id,on_hand,reserved)
SELECT * FROM (
  SELECT '99000000-6250-0000-0000-000000000001'::uuid,w.id,p.id,32,2 FROM warehouses w JOIN spare_parts p ON p.part_code='SP-GBIC-SX' WHERE w.code='WH-HQ-01'
  UNION ALL
  SELECT '99000000-6250-0000-0000-000000000003'::uuid,w.id,p.id,4,2 FROM warehouses w JOIN spare_parts p ON p.part_code='SP-FAN-FG100F' WHERE w.code='WH-HQ-01'
) x(id,warehouse_id,part_id,on_hand,reserved)
ON CONFLICT (warehouse_id,part_id) DO UPDATE SET on_hand=EXCLUDED.on_hand,reserved=EXCLUDED.reserved,updated_at=NOW();

INSERT INTO spare_part_lots (id,warehouse_id,part_id,lot_number,manufacture_date,expiry_date,on_hand,reserved,status)
SELECT '99000000-6900-0000-0000-000000000001',w.id,p.id,'LOT-SX-2025Q4',CURRENT_DATE-200,CURRENT_DATE+540,20,2,'active'::varchar
FROM warehouses w JOIN spare_parts p ON p.part_code='SP-GBIC-SX' WHERE w.code='WH-HQ-01'
ON CONFLICT (warehouse_id,part_id,lot_number) DO UPDATE SET manufacture_date=EXCLUDED.manufacture_date,expiry_date=EXCLUDED.expiry_date,on_hand=EXCLUDED.on_hand,reserved=EXCLUDED.reserved,status=EXCLUDED.status,updated_at=NOW();
INSERT INTO spare_part_movements (id,warehouse_id,part_id,movement_type,qty,unit_cost,ref_type,ref_id,actor_user_id,correlation_id)
SELECT '99000000-6500-0000-0000-000000000001',w.id,p.id,'in',40,95.00,'stock_document',NULL::uuid,'warehouse.lead','seed-feature-complete'
FROM warehouses w JOIN spare_parts p ON p.part_code='SP-GBIC-SX' WHERE w.code='WH-HQ-01'
ON CONFLICT (id) DO UPDATE SET movement_type=EXCLUDED.movement_type,qty=EXCLUDED.qty,unit_cost=EXCLUDED.unit_cost,ref_type=EXCLUDED.ref_type,ref_id=EXCLUDED.ref_id,actor_user_id=EXCLUDED.actor_user_id,correlation_id=EXCLUDED.correlation_id;

INSERT INTO stock_documents (id,doc_type,code,status,warehouse_id,target_warehouse_id,doc_date,ref_type,ref_id,note,created_by,approved_by,correlation_id,idempotency_key,posted_at,posted_by,supplier,submitter_name,receiver_name,department)
SELECT * FROM (
  SELECT '99000000-6600-0000-0000-000000000001'::uuid,'receipt'::text,'SD-2026-0001'::text,'posted'::text,w.id,NULL::uuid,CURRENT_DATE-20,'purchase_order'::text,NULL::uuid,'Initial receipt for Q1 spare optics replenishment'::text,'warehouse.lead'::text,'ops.manager'::text,'corr-stockdoc-2026-0001'::text,'stockdoc-2026-0001'::varchar,NOW()-INTERVAL '20 days'+INTERVAL '2 hours','ops.manager'::text,'Cisco Vietnam'::varchar,'Tran Van A'::varchar,'Kho Trung Tam'::varchar,'NOC'::varchar FROM warehouses w WHERE w.code='WH-HQ-01'
  UNION ALL
  SELECT '99000000-6600-0000-0000-000000000002'::uuid,'issue'::text,'SD-2026-0002'::text,'posted'::text,w.id,NULL::uuid,CURRENT_DATE-7,'repair_order'::text,NULL::uuid,'Issue one firewall fan module for urgent repair'::text,'warehouse.lead'::text,'ops.manager'::text,'corr-stockdoc-2026-0002'::text,'stockdoc-2026-0002'::varchar,NOW()-INTERVAL '7 days'+INTERVAL '1 hour','ops.manager'::text,NULL::varchar,'Le Thi C'::varchar,'Nguyen Van B'::varchar,'NOC'::varchar FROM warehouses w WHERE w.code='WH-HQ-01'
) x(id,doc_type,code,status,warehouse_id,target_warehouse_id,doc_date,ref_type,ref_id,note,created_by,approved_by,correlation_id,idempotency_key,posted_at,posted_by,supplier,submitter_name,receiver_name,department)
ON CONFLICT (code) DO UPDATE SET doc_type=EXCLUDED.doc_type,status=EXCLUDED.status,warehouse_id=EXCLUDED.warehouse_id,target_warehouse_id=EXCLUDED.target_warehouse_id,doc_date=EXCLUDED.doc_date,ref_type=EXCLUDED.ref_type,ref_id=EXCLUDED.ref_id,note=EXCLUDED.note,created_by=EXCLUDED.created_by,approved_by=EXCLUDED.approved_by,correlation_id=EXCLUDED.correlation_id,idempotency_key=EXCLUDED.idempotency_key,posted_at=EXCLUDED.posted_at,posted_by=EXCLUDED.posted_by,supplier=EXCLUDED.supplier,submitter_name=EXCLUDED.submitter_name,receiver_name=EXCLUDED.receiver_name,department=EXCLUDED.department,updated_at=NOW();

INSERT INTO stock_document_lines (id,document_id,part_id,qty,unit_cost,serial_no,note,adjust_direction,spec_fields)
SELECT * FROM (
  SELECT '99000000-6610-0000-0000-000000000001'::uuid,d.id,p.id,20,90.00,NULL::text,'Received optics from approved supplier'::text,NULL::text,'{"batch":"LOT-SX-2025Q4"}'::jsonb FROM stock_documents d JOIN spare_parts p ON p.part_code='SP-GBIC-SX' WHERE d.code='SD-2026-0001'
  UNION ALL
  SELECT '99000000-6610-0000-0000-000000000002'::uuid,d.id,p.id,1,120.00,NULL::text,'Issued fan module for firewall repair order'::text,NULL::text,'{"repairCode":"RO-2026-0001"}'::jsonb FROM stock_documents d JOIN spare_parts p ON p.part_code='SP-FAN-FG100F' WHERE d.code='SD-2026-0002'
) x(id,document_id,part_id,qty,unit_cost,serial_no,note,adjust_direction,spec_fields)
ON CONFLICT (id) DO UPDATE SET document_id=EXCLUDED.document_id,part_id=EXCLUDED.part_id,qty=EXCLUDED.qty,unit_cost=EXCLUDED.unit_cost,serial_no=EXCLUDED.serial_no,note=EXCLUDED.note,adjust_direction=EXCLUDED.adjust_direction,spec_fields=EXCLUDED.spec_fields;

INSERT INTO repair_orders (id,asset_id,code,title,description,severity,status,opened_at,closed_at,diagnosis,resolution,repair_type,technician_name,vendor_id,labor_cost,parts_cost,downtime_minutes,created_by,correlation_id,ci_id)
SELECT * FROM (
  SELECT '99000000-6700-0000-0000-000000000001'::uuid,a.id,'RO-2026-0001'::text,'Firewall fan module replacement'::text,'Edge firewall reported thermal alarm and fan failure on slot 2'::text,'high'::text,'waiting_parts'::text,NOW()-INTERVAL '7 days',NULL::timestamptz,'Fan module FG100F failure confirmed'::text,NULL::text,'internal'::text,'Nguyen Van B'::text,(SELECT id FROM vendors ORDER BY created_at LIMIT 1),180.00::numeric,120.00::numeric,210::int,'ops.manager'::text,'repair-2026-0001'::text,c.id FROM assets a JOIN cmdb_cis c ON c.ci_code='CI-NET-FW-EDGE-01' WHERE a.asset_code='AST-FW-0001'
  UNION ALL
  SELECT '99000000-6700-0000-0000-000000000002'::uuid,a.id,'RO-2026-0002'::text,'Server NIC firmware upgrade'::text,'Authentication server showed intermittent link flap under peak load'::text,'medium'::text,'closed'::text,NOW()-INTERVAL '15 days',NOW()-INTERVAL '14 days','Outdated NIC firmware caused packet drops'::text,'Firmware upgraded and burn-in test passed'::text,'vendor'::text,'Fortinet Service Partner'::text,(SELECT id FROM vendors ORDER BY created_at LIMIT 1),250.00::numeric,0.00::numeric,95::int,'cmdb.owner'::text,'repair-2026-0002'::text,c.id FROM assets a JOIN cmdb_cis c ON c.ci_code='CI-SRV-AUTH-01' WHERE a.asset_code='AST-SRV-0001'
) x(id,asset_id,code,title,description,severity,status,opened_at,closed_at,diagnosis,resolution,repair_type,technician_name,vendor_id,labor_cost,parts_cost,downtime_minutes,created_by,correlation_id,ci_id)
ON CONFLICT (code) DO UPDATE SET asset_id=EXCLUDED.asset_id,title=EXCLUDED.title,description=EXCLUDED.description,severity=EXCLUDED.severity,status=EXCLUDED.status,opened_at=EXCLUDED.opened_at,closed_at=EXCLUDED.closed_at,diagnosis=EXCLUDED.diagnosis,resolution=EXCLUDED.resolution,repair_type=EXCLUDED.repair_type,technician_name=EXCLUDED.technician_name,vendor_id=EXCLUDED.vendor_id,labor_cost=EXCLUDED.labor_cost,parts_cost=EXCLUDED.parts_cost,downtime_minutes=EXCLUDED.downtime_minutes,created_by=EXCLUDED.created_by,correlation_id=EXCLUDED.correlation_id,ci_id=EXCLUDED.ci_id,updated_at=NOW();

INSERT INTO repair_order_parts (id,repair_order_id,part_id,part_name,warehouse_id,action,qty,unit_cost,serial_no,note,stock_document_id)
SELECT * FROM (
  SELECT '99000000-6710-0000-0000-000000000001'::uuid,r.id,p.id,p.name,w.id,'replace'::text,1,120.00,NULL::text,'Fan module replaced from warehouse stock'::text,d.id FROM repair_orders r JOIN spare_parts p ON p.part_code='SP-FAN-FG100F' JOIN warehouses w ON w.code='WH-HQ-01' JOIN stock_documents d ON d.code='SD-2026-0002' WHERE r.code='RO-2026-0001'
  UNION ALL
  SELECT '99000000-6710-0000-0000-000000000002'::uuid,r.id,p.id,p.name,w.id,'add'::text,2,95.00,NULL::text,'Prepared spare optics for post-repair failover validation'::text,d.id FROM repair_orders r JOIN spare_parts p ON p.part_code='SP-GBIC-SX' JOIN warehouses w ON w.code='WH-HQ-01' JOIN stock_documents d ON d.code='SD-2026-0001' WHERE r.code='RO-2026-0002'
) x(id,repair_order_id,part_id,part_name,warehouse_id,action,qty,unit_cost,serial_no,note,stock_document_id)
ON CONFLICT (id) DO UPDATE SET repair_order_id=EXCLUDED.repair_order_id,part_id=EXCLUDED.part_id,part_name=EXCLUDED.part_name,warehouse_id=EXCLUDED.warehouse_id,action=EXCLUDED.action,qty=EXCLUDED.qty,unit_cost=EXCLUDED.unit_cost,serial_no=EXCLUDED.serial_no,note=EXCLUDED.note,stock_document_id=EXCLUDED.stock_document_id;

-- Legacy modules: accessories
INSERT INTO suppliers (id,code,name,contact_name,contact_email,contact_phone,address,website,notes,is_active) VALUES
  ('99200000-0000-0000-0000-000000000001','SUP-ITDIST','IT Distribution Vietnam','Nguyen Minh Duc','sales@itdist.vn','+84-28-3939-8282','District 1, Ho Chi Minh City','https://itdist.vn','Primary distributor for endpoints and peripherals',true),
  ('99200000-0000-0000-0000-000000000002','SUP-MICROSOFT-VN','Microsoft Vietnam Partner Desk','Tran Hoang Yen','enterprise@ms-vn.example','+84-24-3628-1111','Cau Giay, Hanoi','https://www.microsoft.com/vi-vn','Handles Microsoft enterprise licensing',true),
  ('99200000-0000-0000-0000-000000000003','SUP-PRINTCARE','PrintCare Supplies Co., Ltd.','Le Van Quang','support@printcare.vn','+84-28-3850-5656','Tan Binh, Ho Chi Minh City','https://printcare.vn','Supplier for toner and label consumables',true)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name,contact_name=EXCLUDED.contact_name,contact_email=EXCLUDED.contact_email,contact_phone=EXCLUDED.contact_phone,address=EXCLUDED.address,website=EXCLUDED.website,notes=EXCLUDED.notes,is_active=EXCLUDED.is_active,updated_at=NOW();

INSERT INTO accessory_categories (id,code,name,description,parent_id,is_active,created_by)
VALUES
  ('99210000-0000-0000-0000-000000000001','ACC-DOCK','Docking Stations','USB-C and Thunderbolt docking accessories',NULL,true,COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid)),
  ('99210000-0000-0000-0000-000000000002','ACC-CASE','Protective Cases','Sleeves and carrying cases for endpoints',NULL,true,COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid)),
  ('99210000-0000-0000-0000-000000000003','ACC-PWR','Power Adapters','Spare power and charging accessories',NULL,true,COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid))
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name,description=EXCLUDED.description,parent_id=EXCLUDED.parent_id,is_active=EXCLUDED.is_active,updated_at=NOW();

INSERT INTO accessory_manufacturers (id,code,name,website,support_url,support_phone,support_email,notes,is_active,created_by)
VALUES
  ('99211000-0000-0000-0000-000000000001','MFG-DELL-ACC','Dell Technologies','https://www.dell.com','https://www.dell.com/support','1800-545455','support@dell.example','OEM accessories for corporate laptops',true,COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid)),
  ('99211000-0000-0000-0000-000000000002','MFG-ANKER','Anker','https://www.anker.com','https://support.anker.com','1800-111222','support@anker.example','Third-party accessories with strong reliability',true,COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid))
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name,website=EXCLUDED.website,support_url=EXCLUDED.support_url,support_phone=EXCLUDED.support_phone,support_email=EXCLUDED.support_email,notes=EXCLUDED.notes,is_active=EXCLUDED.is_active,updated_at=NOW();

INSERT INTO accessories (id,accessory_code,name,model_number,category_id,manufacturer_id,image_url,total_quantity,available_quantity,min_quantity,unit_price,currency,supplier_id,purchase_order,purchase_date,location_id,location_name,notes,organization_id,status,created_by,updated_by)
SELECT * FROM (
  SELECT
    '99212000-0000-0000-0000-000000000001'::uuid,'ACC-DOCK-WD19S'::varchar,'Dell WD19S USB-C Dock'::varchar,'WD19S'::varchar,
    c.id,m.id,NULL::varchar,24,17,5,165.00,'USD',s.id,'PO-IT-2026-0142'::varchar,CURRENT_DATE-90,
    (SELECT id FROM locations WHERE name ILIKE '%HQ%' ORDER BY created_at LIMIT 1),'HQ IT Storage'::varchar,
    'Assigned for NOC and support engineers working hybrid shifts'::text,'99000000-7000-0000-0000-000000000001'::uuid,'active'::varchar,
    COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid),
    COALESCE((SELECT id FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1),'99000000-0000-0000-0000-000000000002'::uuid)
  FROM accessory_categories c JOIN accessory_manufacturers m ON m.code='MFG-DELL-ACC' JOIN suppliers s ON s.code='SUP-ITDIST' WHERE c.code='ACC-DOCK'
  UNION ALL
  SELECT
    '99212000-0000-0000-0000-000000000002'::uuid,'ACC-SLEEVE-13'::varchar,'13-inch Laptop Protective Sleeve'::varchar,'A13-SLIM'::varchar,
    c.id,m.id,NULL::varchar,50,40,10,22.00,'USD',s.id,'PO-IT-2026-0158'::varchar,CURRENT_DATE-75,
    (SELECT id FROM locations WHERE name ILIKE '%HQ%' ORDER BY created_at LIMIT 1),'HQ Logistics Shelf B'::varchar,
    'Issued to new joiners during onboarding kit handover'::text,'99000000-7000-0000-0000-000000000001'::uuid,'active'::varchar,
    COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid),
    COALESCE((SELECT id FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1),'99000000-0000-0000-0000-000000000002'::uuid)
  FROM accessory_categories c JOIN accessory_manufacturers m ON m.code='MFG-ANKER' JOIN suppliers s ON s.code='SUP-ITDIST' WHERE c.code='ACC-CASE'
) x(id,accessory_code,name,model_number,category_id,manufacturer_id,image_url,total_quantity,available_quantity,min_quantity,unit_price,currency,supplier_id,purchase_order,purchase_date,location_id,location_name,notes,organization_id,status,created_by,updated_by)
ON CONFLICT (accessory_code) DO UPDATE SET
  name=EXCLUDED.name,model_number=EXCLUDED.model_number,category_id=EXCLUDED.category_id,manufacturer_id=EXCLUDED.manufacturer_id,image_url=EXCLUDED.image_url,total_quantity=EXCLUDED.total_quantity,available_quantity=EXCLUDED.available_quantity,min_quantity=EXCLUDED.min_quantity,unit_price=EXCLUDED.unit_price,currency=EXCLUDED.currency,supplier_id=EXCLUDED.supplier_id,purchase_order=EXCLUDED.purchase_order,purchase_date=EXCLUDED.purchase_date,location_id=EXCLUDED.location_id,location_name=EXCLUDED.location_name,notes=EXCLUDED.notes,organization_id=EXCLUDED.organization_id,status=EXCLUDED.status,updated_by=EXCLUDED.updated_by,updated_at=NOW();

INSERT INTO accessory_stock_adjustments (id,accessory_id,adjustment_type,quantity_change,quantity_before,quantity_after,reference_type,reference_id,reference_number,reason,notes,performed_by,performed_at)
SELECT * FROM (
  SELECT '99213000-0000-0000-0000-000000000001'::uuid,a.id,'initial_stock'::varchar,24,0,24,'migration'::varchar,NULL::uuid,'LEGACY-ACC-INIT-01'::varchar,'Initial stock bootstrap for legacy accessory module'::text,'Imported from physical stock take on go-live week'::text,COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid),NOW()-INTERVAL '60 days' FROM accessories a WHERE a.accessory_code='ACC-DOCK-WD19S'
  UNION ALL
  SELECT '99213000-0000-0000-0000-000000000002'::uuid,a.id,'purchase'::varchar,50,0,50,'purchase_order'::varchar,NULL::uuid,'PO-IT-2026-0158'::varchar,'Quarterly restock for onboarding accessories'::text,'Received and counted by logistics team'::text,COALESCE((SELECT id FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1),'99000000-0000-0000-0000-000000000002'::uuid),NOW()-INTERVAL '45 days' FROM accessories a WHERE a.accessory_code='ACC-SLEEVE-13'
) x(id,accessory_id,adjustment_type,quantity_change,quantity_before,quantity_after,reference_type,reference_id,reference_number,reason,notes,performed_by,performed_at)
ON CONFLICT (id) DO UPDATE SET
  accessory_id=EXCLUDED.accessory_id,adjustment_type=EXCLUDED.adjustment_type,quantity_change=EXCLUDED.quantity_change,quantity_before=EXCLUDED.quantity_before,quantity_after=EXCLUDED.quantity_after,reference_type=EXCLUDED.reference_type,reference_id=EXCLUDED.reference_id,reference_number=EXCLUDED.reference_number,reason=EXCLUDED.reason,notes=EXCLUDED.notes,performed_by=EXCLUDED.performed_by,performed_at=EXCLUDED.performed_at;

INSERT INTO accessory_checkouts (id,accessory_id,quantity,quantity_returned,assignment_type,assigned_user_id,assigned_asset_id,checkout_date,expected_checkin_date,actual_checkin_date,checked_out_by,checked_in_by,checkout_notes,checkin_notes,status)
SELECT * FROM (
  SELECT
    '99213100-0000-0000-0000-000000000001'::uuid,a.id,4,1,'user'::varchar,
    (SELECT id FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1),NULL::uuid,
    NOW()-INTERVAL '10 days',CURRENT_DATE+20,NULL::timestamptz,
    COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid),
    COALESCE((SELECT id FROM users WHERE email='cmdb.owner@netopsai.com' LIMIT 1),'99000000-0000-0000-0000-000000000003'::uuid),
    'Issued for temporary remote-work setup of NOC managers'::text,'One dock returned after desk consolidation'::text,'partially_returned'::varchar
  FROM accessories a WHERE a.accessory_code='ACC-DOCK-WD19S'
  UNION ALL
  SELECT
    '99213100-0000-0000-0000-000000000002'::uuid,a.id,10,0,'asset'::varchar,
    NULL::uuid,(SELECT id FROM assets WHERE asset_code='AST-LAP-0002' LIMIT 1),
    NOW()-INTERVAL '12 days',CURRENT_DATE+30,NULL::timestamptz,
    COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid),
    NULL::uuid,
    'Bulk issue for onboarding batch Q2/2026'::text,NULL::text,'checked_out'::varchar
  FROM accessories a WHERE a.accessory_code='ACC-SLEEVE-13'
) x(id,accessory_id,quantity,quantity_returned,assignment_type,assigned_user_id,assigned_asset_id,checkout_date,expected_checkin_date,actual_checkin_date,checked_out_by,checked_in_by,checkout_notes,checkin_notes,status)
ON CONFLICT (id) DO UPDATE SET
  accessory_id=EXCLUDED.accessory_id,quantity=EXCLUDED.quantity,quantity_returned=EXCLUDED.quantity_returned,assignment_type=EXCLUDED.assignment_type,assigned_user_id=EXCLUDED.assigned_user_id,assigned_asset_id=EXCLUDED.assigned_asset_id,checkout_date=EXCLUDED.checkout_date,expected_checkin_date=EXCLUDED.expected_checkin_date,actual_checkin_date=EXCLUDED.actual_checkin_date,checked_out_by=EXCLUDED.checked_out_by,checked_in_by=EXCLUDED.checked_in_by,checkout_notes=EXCLUDED.checkout_notes,checkin_notes=EXCLUDED.checkin_notes,status=EXCLUDED.status,updated_at=NOW();

INSERT INTO accessory_audit_logs (id,accessory_id,action,field_name,old_value,new_value,checkout_id,adjustment_id,notes,performed_by,performed_at)
SELECT * FROM (
  SELECT '99213200-0000-0000-0000-000000000001'::uuid,a.id,'stock_adjustment.applied'::varchar,'total_quantity'::varchar,'0'::jsonb,'24'::jsonb,NULL::uuid,'99213000-0000-0000-0000-000000000001'::uuid,'Initial quantity registration'::text,COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid),NOW()-INTERVAL '60 days' FROM accessories a WHERE a.accessory_code='ACC-DOCK-WD19S'
  UNION ALL
  SELECT '99213200-0000-0000-0000-000000000002'::uuid,a.id,'checkout.created'::varchar,'available_quantity'::varchar,'24'::jsonb,'20'::jsonb,'99213100-0000-0000-0000-000000000001'::uuid,NULL::uuid,'Checkout created for remote work support'::text,COALESCE((SELECT id FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1),'99000000-0000-0000-0000-000000000002'::uuid),NOW()-INTERVAL '10 days' FROM accessories a WHERE a.accessory_code='ACC-DOCK-WD19S'
  UNION ALL
  SELECT '99213200-0000-0000-0000-000000000003'::uuid,a.id,'checkout.created'::varchar,'available_quantity'::varchar,'50'::jsonb,'40'::jsonb,'99213100-0000-0000-0000-000000000002'::uuid,NULL::uuid,'Bulk issue to onboarding assets'::text,COALESCE((SELECT id FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1),'99000000-0000-0000-0000-000000000002'::uuid),NOW()-INTERVAL '12 days' FROM accessories a WHERE a.accessory_code='ACC-SLEEVE-13'
) x(id,accessory_id,action,field_name,old_value,new_value,checkout_id,adjustment_id,notes,performed_by,performed_at)
ON CONFLICT (id) DO UPDATE SET
  accessory_id=EXCLUDED.accessory_id,action=EXCLUDED.action,field_name=EXCLUDED.field_name,old_value=EXCLUDED.old_value,new_value=EXCLUDED.new_value,checkout_id=EXCLUDED.checkout_id,adjustment_id=EXCLUDED.adjustment_id,notes=EXCLUDED.notes,performed_by=EXCLUDED.performed_by,performed_at=EXCLUDED.performed_at;

-- Legacy modules: components
INSERT INTO component_categories (id,code,name,description,parent_id,is_active,created_by)
VALUES
  ('99220000-0000-0000-0000-000000000001','CMP-RAM','Memory Modules','Server and workstation RAM components',NULL,true,COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid)),
  ('99220000-0000-0000-0000-000000000002','CMP-NIC','Network Interface Cards','Ethernet and optical interface cards',NULL,true,COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid))
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name,description=EXCLUDED.description,parent_id=EXCLUDED.parent_id,is_active=EXCLUDED.is_active,updated_at=NOW();

INSERT INTO component_manufacturers (id,code,name,website,support_url,support_phone,support_email,notes,is_active,created_by)
VALUES
  ('99221000-0000-0000-0000-000000000001','MFG-SAMSUNG-CMP','Samsung Electronics','https://www.samsung.com','https://www.samsung.com/support','1800-588889','support@samsung.example','Server-grade memory supplier',true,COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid)),
  ('99221000-0000-0000-0000-000000000002','MFG-INTEL-CMP','Intel','https://www.intel.com','https://www.intel.com/support','1800-678900','support@intel.example','Network interface cards and controller chipsets',true,COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid))
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name,website=EXCLUDED.website,support_url=EXCLUDED.support_url,support_phone=EXCLUDED.support_phone,support_email=EXCLUDED.support_email,notes=EXCLUDED.notes,is_active=EXCLUDED.is_active,updated_at=NOW();

INSERT INTO components (id,component_code,name,model_number,category_id,manufacturer_id,component_type,specifications,image_url,total_quantity,available_quantity,min_quantity,unit_price,currency,supplier_id,purchase_order,purchase_date,location_id,location_name,organization_id,notes,status,created_by,updated_by)
SELECT * FROM (
  SELECT
    '99222000-0000-0000-0000-000000000001'::uuid,'CMP-RAM-32GB-ECC'::varchar,'DDR4 ECC RAM 32GB'::varchar,'M393A4K40BB2'::varchar,
    c.id,m.id,'memory'::varchar,'3200MT/s ECC Registered DIMM'::text,NULL::varchar,12,8,4,110.00,'USD',s.id,'PO-IT-2026-0134'::varchar,CURRENT_DATE-110,
    (SELECT id FROM locations WHERE name ILIKE '%HQ%' ORDER BY created_at LIMIT 1),'HQ Spare Component Rack'::varchar,'99000000-7000-0000-0000-000000000001'::uuid,
    'Reserved for server refresh and break/fix pool'::text,'active'::varchar,
    COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid),
    COALESCE((SELECT id FROM users WHERE email='cmdb.owner@netopsai.com' LIMIT 1),'99000000-0000-0000-0000-000000000003'::uuid)
  FROM component_categories c JOIN component_manufacturers m ON m.code='MFG-SAMSUNG-CMP' JOIN suppliers s ON s.code='SUP-ITDIST' WHERE c.code='CMP-RAM'
  UNION ALL
  SELECT
    '99222000-0000-0000-0000-000000000002'::uuid,'CMP-NIC-10G-X520'::varchar,'Intel X520 Dual Port 10GbE'::varchar,'X520-DA2'::varchar,
    c.id,m.id,'network'::varchar,'Dual-port SFP+ PCIe adapter'::text,NULL::varchar,6,5,2,185.00,'USD',s.id,'PO-IT-2026-0140'::varchar,CURRENT_DATE-100,
    (SELECT id FROM locations WHERE name ILIKE '%HQ%' ORDER BY created_at LIMIT 1),'HQ Network Lab'::varchar,'99000000-7000-0000-0000-000000000001'::uuid,
    'For server uplink upgrades and redundancy improvements'::text,'active'::varchar,
    COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid),
    COALESCE((SELECT id FROM users WHERE email='cmdb.owner@netopsai.com' LIMIT 1),'99000000-0000-0000-0000-000000000003'::uuid)
  FROM component_categories c JOIN component_manufacturers m ON m.code='MFG-INTEL-CMP' JOIN suppliers s ON s.code='SUP-ITDIST' WHERE c.code='CMP-NIC'
) x(id,component_code,name,model_number,category_id,manufacturer_id,component_type,specifications,image_url,total_quantity,available_quantity,min_quantity,unit_price,currency,supplier_id,purchase_order,purchase_date,location_id,location_name,organization_id,notes,status,created_by,updated_by)
ON CONFLICT (component_code) DO UPDATE SET
  name=EXCLUDED.name,model_number=EXCLUDED.model_number,category_id=EXCLUDED.category_id,manufacturer_id=EXCLUDED.manufacturer_id,component_type=EXCLUDED.component_type,specifications=EXCLUDED.specifications,image_url=EXCLUDED.image_url,total_quantity=EXCLUDED.total_quantity,available_quantity=EXCLUDED.available_quantity,min_quantity=EXCLUDED.min_quantity,unit_price=EXCLUDED.unit_price,currency=EXCLUDED.currency,supplier_id=EXCLUDED.supplier_id,purchase_order=EXCLUDED.purchase_order,purchase_date=EXCLUDED.purchase_date,location_id=EXCLUDED.location_id,location_name=EXCLUDED.location_name,organization_id=EXCLUDED.organization_id,notes=EXCLUDED.notes,status=EXCLUDED.status,updated_by=EXCLUDED.updated_by,updated_at=NOW();

INSERT INTO component_receipts (id,component_id,quantity,serial_numbers,receipt_type,supplier_id,purchase_order,unit_cost,reference_number,reference_type,reference_id,received_by,received_at,notes)
SELECT * FROM (
  SELECT '99223000-0000-0000-0000-000000000001'::uuid,c.id,12,ARRAY['RAM32ECC-26001','RAM32ECC-26002','RAM32ECC-26003']::text[],'initial'::varchar,s.id,'PO-IT-2026-0134'::varchar,108.00,'RCPT-CMP-2026-0001'::varchar,'migration'::varchar,NULL::uuid,COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid),NOW()-INTERVAL '95 days','Initial memory stock loaded for server refresh'::text FROM components c JOIN suppliers s ON s.code='SUP-ITDIST' WHERE c.component_code='CMP-RAM-32GB-ECC'
  UNION ALL
  SELECT '99223000-0000-0000-0000-000000000002'::uuid,c.id,6,ARRAY['INTELX520-26001','INTELX520-26002']::text[],'purchase'::varchar,s.id,'PO-IT-2026-0140'::varchar,182.00,'RCPT-CMP-2026-0002'::varchar,'purchase_order'::varchar,NULL::uuid,COALESCE((SELECT id FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1),'99000000-0000-0000-0000-000000000002'::uuid),NOW()-INTERVAL '88 days','Received NICs for 10GbE uplift project'::text FROM components c JOIN suppliers s ON s.code='SUP-ITDIST' WHERE c.component_code='CMP-NIC-10G-X520'
) x(id,component_id,quantity,serial_numbers,receipt_type,supplier_id,purchase_order,unit_cost,reference_number,reference_type,reference_id,received_by,received_at,notes)
ON CONFLICT (id) DO UPDATE SET
  component_id=EXCLUDED.component_id,quantity=EXCLUDED.quantity,serial_numbers=EXCLUDED.serial_numbers,receipt_type=EXCLUDED.receipt_type,supplier_id=EXCLUDED.supplier_id,purchase_order=EXCLUDED.purchase_order,unit_cost=EXCLUDED.unit_cost,reference_number=EXCLUDED.reference_number,reference_type=EXCLUDED.reference_type,reference_id=EXCLUDED.reference_id,received_by=EXCLUDED.received_by,received_at=EXCLUDED.received_at,notes=EXCLUDED.notes;

INSERT INTO component_assignments (id,component_id,quantity,serial_numbers,asset_id,installed_at,installed_by,installation_notes,removed_at,removed_by,removal_reason,removal_notes,post_removal_action,status)
SELECT * FROM (
  SELECT '99223100-0000-0000-0000-000000000001'::uuid,c.id,2,ARRAY['RAM32ECC-26001','RAM32ECC-26002']::text[],a.id,NOW()-INTERVAL '40 days',COALESCE((SELECT id FROM users WHERE email='cmdb.owner@netopsai.com' LIMIT 1),'99000000-0000-0000-0000-000000000003'::uuid),'Installed to expand memory on authentication server'::text,NULL::timestamptz,NULL::uuid,NULL::varchar,NULL::text,NULL::varchar,'installed'::varchar FROM components c JOIN assets a ON a.asset_code='AST-SRV-0001' WHERE c.component_code='CMP-RAM-32GB-ECC'
  UNION ALL
  SELECT '99223100-0000-0000-0000-000000000002'::uuid,c.id,1,ARRAY['INTELX520-26001']::text[],a.id,NOW()-INTERVAL '35 days',COALESCE((SELECT id FROM users WHERE email='cmdb.owner@netopsai.com' LIMIT 1),'99000000-0000-0000-0000-000000000003'::uuid),'Installed dual-port 10GbE uplink card for HA connectivity'::text,NULL::timestamptz,NULL::uuid,NULL::varchar,NULL::text,NULL::varchar,'installed'::varchar FROM components c JOIN assets a ON a.asset_code='AST-SRV-0001' WHERE c.component_code='CMP-NIC-10G-X520'
) x(id,component_id,quantity,serial_numbers,asset_id,installed_at,installed_by,installation_notes,removed_at,removed_by,removal_reason,removal_notes,post_removal_action,status)
ON CONFLICT (id) DO UPDATE SET
  component_id=EXCLUDED.component_id,quantity=EXCLUDED.quantity,serial_numbers=EXCLUDED.serial_numbers,asset_id=EXCLUDED.asset_id,installed_at=EXCLUDED.installed_at,installed_by=EXCLUDED.installed_by,installation_notes=EXCLUDED.installation_notes,removed_at=EXCLUDED.removed_at,removed_by=EXCLUDED.removed_by,removal_reason=EXCLUDED.removal_reason,removal_notes=EXCLUDED.removal_notes,post_removal_action=EXCLUDED.post_removal_action,status=EXCLUDED.status,updated_at=NOW();

INSERT INTO component_audit_logs (id,component_id,assignment_id,receipt_id,action,action_type,old_values,new_values,performed_by,performed_at,ip_address,user_agent,notes)
SELECT * FROM (
  SELECT '99223200-0000-0000-0000-000000000001'::uuid,c.id,NULL::uuid,r.id,'receipt.created'::varchar,'stock_in'::varchar,NULL::jsonb,'{"quantity":12,"reference":"RCPT-CMP-2026-0001"}'::jsonb,COALESCE((SELECT id FROM users WHERE email='admin@example.com' LIMIT 1),'99000000-0000-0000-0000-000000000001'::uuid),NOW()-INTERVAL '95 days','10.10.20.20'::inet,'Mozilla/5.0'::text,'Initial stock receipt recorded'::text FROM components c JOIN component_receipts r ON r.id='99223000-0000-0000-0000-000000000001'::uuid WHERE c.component_code='CMP-RAM-32GB-ECC'
  UNION ALL
  SELECT '99223200-0000-0000-0000-000000000002'::uuid,c.id,a.id,NULL::uuid,'assignment.installed'::varchar,'asset_attach'::varchar,'{"available_before":9}'::jsonb,'{"available_after":8,"asset":"AST-SRV-0001"}'::jsonb,COALESCE((SELECT id FROM users WHERE email='cmdb.owner@netopsai.com' LIMIT 1),'99000000-0000-0000-0000-000000000003'::uuid),NOW()-INTERVAL '35 days','10.10.20.21'::inet,'Mozilla/5.0'::text,'NIC installed during server network uplift'::text FROM components c JOIN component_assignments a ON a.id='99223100-0000-0000-0000-000000000002'::uuid WHERE c.component_code='CMP-NIC-10G-X520'
) x(id,component_id,assignment_id,receipt_id,action,action_type,old_values,new_values,performed_by,performed_at,ip_address,user_agent,notes)
ON CONFLICT (id) DO UPDATE SET
  component_id=EXCLUDED.component_id,assignment_id=EXCLUDED.assignment_id,receipt_id=EXCLUDED.receipt_id,action=EXCLUDED.action,action_type=EXCLUDED.action_type,old_values=EXCLUDED.old_values,new_values=EXCLUDED.new_values,performed_by=EXCLUDED.performed_by,performed_at=EXCLUDED.performed_at,ip_address=EXCLUDED.ip_address,user_agent=EXCLUDED.user_agent,notes=EXCLUDED.notes;

-- Legacy modules: consumables
INSERT INTO consumable_categories (id,code,name,description,parent_id,is_active)
VALUES
  ('99230000-0000-0000-0000-000000000001','CNS-PRINT','Printing Supplies','Toner, ink, and print consumables',NULL,true),
  ('99230000-0000-0000-0000-000000000002','CNS-LABEL','Label Supplies','Thermal and adhesive labels',NULL,true)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name,description=EXCLUDED.description,parent_id=EXCLUDED.parent_id,is_active=EXCLUDED.is_active,updated_at=NOW();

INSERT INTO consumable_manufacturers (id,code,name,website,support_url,support_phone,support_email,notes,is_active)
VALUES
  ('99231000-0000-0000-0000-000000000001','MFG-HP-CNS','HP','https://www.hp.com','https://support.hp.com','1800-112233','support@hp.example','Official manufacturer of toner cartridges',true),
  ('99231000-0000-0000-0000-000000000002','MFG-BROTHER-CNS','Brother','https://www.brother.com','https://support.brother.com','1800-334455','support@brother.example','Label tape and industrial printing consumables',true)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name,website=EXCLUDED.website,support_url=EXCLUDED.support_url,support_phone=EXCLUDED.support_phone,support_email=EXCLUDED.support_email,notes=EXCLUDED.notes,is_active=EXCLUDED.is_active,updated_at=NOW();

INSERT INTO consumables (id,consumable_code,name,category_id,manufacturer_id,model_number,part_number,image_url,unit_of_measure,quantity,min_quantity,unit_price,currency,supplier_id,purchase_order,purchase_date,location_id,location_name,notes,organization_id,status,created_by,updated_by)
SELECT * FROM (
  SELECT
    '99232000-0000-0000-0000-000000000001'::uuid,'CNS-TONER-89A'::varchar,'HP 89A Black Toner Cartridge'::varchar,c.id,m.id,'CF289A'::varchar,'89A'::varchar,NULL::varchar,'cartridge'::varchar,18,6,72.00,'USD',s.id,'PO-OPS-2026-0188'::varchar,CURRENT_DATE-30,
    (SELECT id FROM locations WHERE name ILIKE '%HQ%' ORDER BY created_at LIMIT 1),'HQ Print Supply Cabinet'::varchar,'Monthly stock for NOC and service desk printers'::text,'99000000-7000-0000-0000-000000000001'::uuid,'active'::varchar,'warehouse.lead'::varchar,'warehouse.lead'::varchar
  FROM consumable_categories c JOIN consumable_manufacturers m ON m.code='MFG-HP-CNS' JOIN suppliers s ON s.code='SUP-PRINTCARE' WHERE c.code='CNS-PRINT'
  UNION ALL
  SELECT
    '99232000-0000-0000-0000-000000000002'::uuid,'CNS-LABEL-DK22205'::varchar,'Brother DK-22205 Continuous Label Roll'::varchar,c.id,m.id,'DK-22205'::varchar,'DK22205'::varchar,NULL::varchar,'roll'::varchar,60,20,18.00,'USD',s.id,'PO-OPS-2026-0191'::varchar,CURRENT_DATE-25,
    (SELECT id FROM locations WHERE name ILIKE '%HQ%' ORDER BY created_at LIMIT 1),'HQ Logistics Label Drawer'::varchar,'Used for tagging warehouse bins and asset handover kits'::text,'99000000-7000-0000-0000-000000000001'::uuid,'active'::varchar,'warehouse.lead'::varchar,'warehouse.lead'::varchar
  FROM consumable_categories c JOIN consumable_manufacturers m ON m.code='MFG-BROTHER-CNS' JOIN suppliers s ON s.code='SUP-PRINTCARE' WHERE c.code='CNS-LABEL'
) x(id,consumable_code,name,category_id,manufacturer_id,model_number,part_number,image_url,unit_of_measure,quantity,min_quantity,unit_price,currency,supplier_id,purchase_order,purchase_date,location_id,location_name,notes,organization_id,status,created_by,updated_by)
ON CONFLICT (consumable_code) DO UPDATE SET
  name=EXCLUDED.name,category_id=EXCLUDED.category_id,manufacturer_id=EXCLUDED.manufacturer_id,model_number=EXCLUDED.model_number,part_number=EXCLUDED.part_number,image_url=EXCLUDED.image_url,unit_of_measure=EXCLUDED.unit_of_measure,quantity=EXCLUDED.quantity,min_quantity=EXCLUDED.min_quantity,unit_price=EXCLUDED.unit_price,currency=EXCLUDED.currency,supplier_id=EXCLUDED.supplier_id,purchase_order=EXCLUDED.purchase_order,purchase_date=EXCLUDED.purchase_date,location_id=EXCLUDED.location_id,location_name=EXCLUDED.location_name,notes=EXCLUDED.notes,organization_id=EXCLUDED.organization_id,status=EXCLUDED.status,updated_by=EXCLUDED.updated_by,updated_at=NOW();

INSERT INTO consumable_receipts (id,consumable_id,quantity,receipt_type,purchase_order,unit_cost,total_cost,receipt_date,supplier_id,invoice_number,received_by,notes)
SELECT * FROM (
  SELECT '99233000-0000-0000-0000-000000000001'::uuid,c.id,20,'purchase'::varchar,'PO-OPS-2026-0188'::varchar,70.00,1400.00,NOW()-INTERVAL '30 days',s.id,'INV-PRINT-2026-0301'::varchar,'warehouse.lead'::varchar,'Toner receipt for monthly replenishment'::text FROM consumables c JOIN suppliers s ON s.code='SUP-PRINTCARE' WHERE c.consumable_code='CNS-TONER-89A'
  UNION ALL
  SELECT '99233000-0000-0000-0000-000000000002'::uuid,c.id,100,'purchase'::varchar,'PO-OPS-2026-0191'::varchar,16.50,1650.00,NOW()-INTERVAL '25 days',s.id,'INV-PRINT-2026-0310'::varchar,'warehouse.lead'::varchar,'Label roll receipt for logistics operation'::text FROM consumables c JOIN suppliers s ON s.code='SUP-PRINTCARE' WHERE c.consumable_code='CNS-LABEL-DK22205'
) x(id,consumable_id,quantity,receipt_type,purchase_order,unit_cost,total_cost,receipt_date,supplier_id,invoice_number,received_by,notes)
ON CONFLICT (id) DO UPDATE SET
  consumable_id=EXCLUDED.consumable_id,quantity=EXCLUDED.quantity,receipt_type=EXCLUDED.receipt_type,purchase_order=EXCLUDED.purchase_order,unit_cost=EXCLUDED.unit_cost,total_cost=EXCLUDED.total_cost,receipt_date=EXCLUDED.receipt_date,supplier_id=EXCLUDED.supplier_id,invoice_number=EXCLUDED.invoice_number,received_by=EXCLUDED.received_by,notes=EXCLUDED.notes,updated_at=NOW();

INSERT INTO consumable_issues (id,consumable_id,quantity,issue_type,issued_to_user_id,issued_to_department,issued_to_asset_id,issue_date,issued_by,reference_number,notes)
SELECT * FROM (
  SELECT '99233100-0000-0000-0000-000000000001'::uuid,c.id,2,'asset'::varchar,NULL::uuid,NULL::varchar,a.id,NOW()-INTERVAL '7 days','warehouse.lead'::varchar,'RO-2026-0001'::varchar,'Issued toner for printer used during incident war-room operations'::text FROM consumables c JOIN assets a ON a.asset_code='AST-FW-0001' WHERE c.consumable_code='CNS-TONER-89A'
  UNION ALL
  SELECT '99233100-0000-0000-0000-000000000002'::uuid,c.id,15,'department'::varchar,NULL::uuid,'Service Desk'::varchar,NULL::uuid,NOW()-INTERVAL '5 days','warehouse.lead'::varchar,'REQ-LABEL-2026-04'::varchar,'Issued labels for new asset tagging batch'::text FROM consumables c WHERE c.consumable_code='CNS-LABEL-DK22205'
) x(id,consumable_id,quantity,issue_type,issued_to_user_id,issued_to_department,issued_to_asset_id,issue_date,issued_by,reference_number,notes)
ON CONFLICT (id) DO UPDATE SET
  consumable_id=EXCLUDED.consumable_id,quantity=EXCLUDED.quantity,issue_type=EXCLUDED.issue_type,issued_to_user_id=EXCLUDED.issued_to_user_id,issued_to_department=EXCLUDED.issued_to_department,issued_to_asset_id=EXCLUDED.issued_to_asset_id,issue_date=EXCLUDED.issue_date,issued_by=EXCLUDED.issued_by,reference_number=EXCLUDED.reference_number,notes=EXCLUDED.notes,updated_at=NOW();

INSERT INTO consumable_audit_logs (id,entity_type,entity_id,action,changes,performed_by,performed_at,ip_address,user_agent,notes)
VALUES
  ('99233200-0000-0000-0000-000000000001','consumable_issue','99233100-0000-0000-0000-000000000001','issue.created','{"quantity":2,"issueType":"asset"}'::jsonb,'warehouse.lead',NOW()-INTERVAL '7 days','10.10.30.20','Mozilla/5.0','Issue transaction created for repair support'),
  ('99233200-0000-0000-0000-000000000002','consumable','99232000-0000-0000-0000-000000000001','quantity.reconciled','{"before":20,"after":18}'::jsonb,'warehouse.lead',NOW()-INTERVAL '6 days','10.10.30.20','Mozilla/5.0','Quantity reconciled after physical count')
ON CONFLICT (id) DO UPDATE SET
  entity_type=EXCLUDED.entity_type,entity_id=EXCLUDED.entity_id,action=EXCLUDED.action,changes=EXCLUDED.changes,performed_by=EXCLUDED.performed_by,performed_at=EXCLUDED.performed_at,ip_address=EXCLUDED.ip_address,user_agent=EXCLUDED.user_agent,notes=EXCLUDED.notes;

-- Legacy modules: licenses
INSERT INTO license_categories (id,name,description)
VALUES
  ('99240000-0000-0000-0000-000000000001','Productivity','Productivity and collaboration software'),
  ('99240000-0000-0000-0000-000000000002','Security','Endpoint and infrastructure security software')
ON CONFLICT (name) DO UPDATE SET
  description=EXCLUDED.description;

INSERT INTO licenses (id,license_code,software_name,supplier_id,category_id,license_type,product_key,seat_count,unit_price,currency,purchase_date,expiry_date,warranty_date,invoice_number,notes,status,organization_id,created_by,updated_by)
SELECT * FROM (
  SELECT '99241000-0000-0000-0000-000000000001'::uuid,'LIC-M365-E3-2026'::varchar,'Microsoft 365 E3'::varchar,s.id,c.id,'per_user'::license_type,'XXXXX-XXXXX-XXXXX-M365E3'::text,50,23.00,'USD',CURRENT_DATE-120,CURRENT_DATE+245,NULL::date,'INV-M365-2026-001'::varchar,'Primary collaboration license pool for IT and operations teams'::text,'active'::license_status,'99000000-7000-0000-0000-000000000001'::uuid,'admin@example.com'::varchar,'admin@example.com'::varchar FROM suppliers s JOIN license_categories c ON c.name='Productivity' WHERE s.code='SUP-MICROSOFT-VN'
  UNION ALL
  SELECT '99241000-0000-0000-0000-000000000002'::uuid,'LIC-CROWDSTRIKE-2026'::varchar,'CrowdStrike Falcon Prevent'::varchar,s.id,c.id,'per_device'::license_type,'XXXXX-XXXXX-XXXXX-FALCON'::text,20,48.00,'USD',CURRENT_DATE-80,CURRENT_DATE+285,NULL::date,'INV-SEC-2026-017'::varchar,'Endpoint security licenses for critical servers and admin laptops'::text,'active'::license_status,'99000000-7000-0000-0000-000000000001'::uuid,'security.lead@netopsai.com'::varchar,'security.lead@netopsai.com'::varchar FROM suppliers s JOIN license_categories c ON c.name='Security' WHERE s.code='SUP-ITDIST'
) x(id,license_code,software_name,supplier_id,category_id,license_type,product_key,seat_count,unit_price,currency,purchase_date,expiry_date,warranty_date,invoice_number,notes,status,organization_id,created_by,updated_by)
ON CONFLICT (license_code) DO UPDATE SET
  software_name=EXCLUDED.software_name,supplier_id=EXCLUDED.supplier_id,category_id=EXCLUDED.category_id,license_type=EXCLUDED.license_type,product_key=EXCLUDED.product_key,seat_count=EXCLUDED.seat_count,unit_price=EXCLUDED.unit_price,currency=EXCLUDED.currency,purchase_date=EXCLUDED.purchase_date,expiry_date=EXCLUDED.expiry_date,warranty_date=EXCLUDED.warranty_date,invoice_number=EXCLUDED.invoice_number,notes=EXCLUDED.notes,status=EXCLUDED.status,organization_id=EXCLUDED.organization_id,updated_by=EXCLUDED.updated_by,updated_at=NOW();

INSERT INTO license_seats (id,license_id,assignment_type,assigned_user_id,assigned_asset_id,assigned_at,assigned_by,notes)
SELECT * FROM (
  SELECT '99242000-0000-0000-0000-000000000001'::uuid,l.id,'user'::seat_assignment_type,u.id,NULL::uuid,NOW()-INTERVAL '20 days','admin@example.com'::varchar,'Assigned for incident coordination and collaboration'::text FROM licenses l JOIN users u ON u.email='ops.manager@netopsai.com' WHERE l.license_code='LIC-M365-E3-2026'
  UNION ALL
  SELECT '99242000-0000-0000-0000-000000000002'::uuid,l.id,'user'::seat_assignment_type,u.id,NULL::uuid,NOW()-INTERVAL '18 days','admin@example.com'::varchar,'Assigned for CMDB operations and report sharing'::text FROM licenses l JOIN users u ON u.email='cmdb.owner@netopsai.com' WHERE l.license_code='LIC-M365-E3-2026'
  UNION ALL
  SELECT '99242000-0000-0000-0000-000000000003'::uuid,l.id,'asset'::seat_assignment_type,NULL::uuid,a.id,NOW()-INTERVAL '15 days','security.lead@netopsai.com'::varchar,'Endpoint security seat bound to privileged admin laptop'::text FROM licenses l JOIN assets a ON a.asset_code='AST-LAP-0001' WHERE l.license_code='LIC-CROWDSTRIKE-2026'
  UNION ALL
  SELECT '99242000-0000-0000-0000-000000000004'::uuid,l.id,'asset'::seat_assignment_type,NULL::uuid,a.id,NOW()-INTERVAL '14 days','security.lead@netopsai.com'::varchar,'Endpoint security seat bound to authentication server'::text FROM licenses l JOIN assets a ON a.asset_code='AST-SRV-0001' WHERE l.license_code='LIC-CROWDSTRIKE-2026'
) x(id,license_id,assignment_type,assigned_user_id,assigned_asset_id,assigned_at,assigned_by,notes)
ON CONFLICT (id) DO UPDATE SET
  license_id=EXCLUDED.license_id,assignment_type=EXCLUDED.assignment_type,assigned_user_id=EXCLUDED.assigned_user_id,assigned_asset_id=EXCLUDED.assigned_asset_id,assigned_at=EXCLUDED.assigned_at,assigned_by=EXCLUDED.assigned_by,notes=EXCLUDED.notes;

INSERT INTO license_audit_logs (id,license_id,action,actor_user_id,old_values,new_values,notes,created_at)
SELECT * FROM (
  SELECT '99243000-0000-0000-0000-000000000001'::uuid,l.id,'seat.assigned'::varchar,'admin@example.com'::varchar,NULL::jsonb,'{"assignment":"user","user":"ops.manager@netopsai.com"}'::jsonb,'Assigned M365 seat to operations manager'::text,NOW()-INTERVAL '20 days' FROM licenses l WHERE l.license_code='LIC-M365-E3-2026'
  UNION ALL
  SELECT '99243000-0000-0000-0000-000000000002'::uuid,l.id,'seat.assigned'::varchar,'security.lead@netopsai.com'::varchar,NULL::jsonb,'{"assignment":"asset","asset":"AST-SRV-0001"}'::jsonb,'Assigned Falcon seat to authentication server'::text,NOW()-INTERVAL '14 days' FROM licenses l WHERE l.license_code='LIC-CROWDSTRIKE-2026'
) x(id,license_id,action,actor_user_id,old_values,new_values,notes,created_at)
ON CONFLICT (id) DO UPDATE SET
  license_id=EXCLUDED.license_id,action=EXCLUDED.action,actor_user_id=EXCLUDED.actor_user_id,old_values=EXCLUDED.old_values,new_values=EXCLUDED.new_values,notes=EXCLUDED.notes,created_at=EXCLUDED.created_at;

INSERT INTO channels (id,type,name,config,enabled) VALUES
  ('99900000-0000-0000-0000-000000000101','telegram','telegram-ops-primary','{"bot":"@netopsai_ops_bot"}'::jsonb,true),
  ('99900000-0000-0000-0000-000000000102','email','email-ops-distribution','{"address":"ops-alerts@netopsai.com"}'::jsonb,true)
ON CONFLICT (id) DO UPDATE SET type=EXCLUDED.type,name=EXCLUDED.name,config=EXCLUDED.config,enabled=EXCLUDED.enabled;
INSERT INTO channel_bindings (id,channel_id,external_user_id,external_chat_id,user_id,status,role_hint)
VALUES ('99900000-1000-0000-0000-000000000101','99900000-0000-0000-0000-000000000101','ops-manager-telegram','tg-chat-ops-001',(SELECT id FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1),'active','incident_commander')
ON CONFLICT (channel_id,external_user_id,external_chat_id) DO UPDATE SET user_id=EXCLUDED.user_id,status=EXCLUDED.status,role_hint=EXCLUDED.role_hint;
INSERT INTO channel_conversations (id,channel_id,external_chat_id,thread_id,conversation_id,updated_at)
VALUES ('99900000-2000-0000-0000-000000000101','99900000-0000-0000-0000-000000000101','tg-chat-ops-001','incident-0315-thread','99100000-0000-0000-0000-000000000001',NOW()-INTERVAL '30 minutes')
ON CONFLICT (channel_id,external_chat_id,thread_id) DO UPDATE SET conversation_id=EXCLUDED.conversation_id,updated_at=EXCLUDED.updated_at;
INSERT INTO alert_subscriptions (id,user_id,channel_id,target_chat_id,alert_types,severity_min,enabled)
VALUES ('99900000-3000-0000-0000-000000000101',(SELECT id FROM users WHERE email='ops.manager@netopsai.com' LIMIT 1),'99900000-0000-0000-0000-000000000101','tg-chat-ops-001',ARRAY['provider.health','net.device_down','cmdb.service_critical'],'warning',true)
ON CONFLICT (id) DO UPDATE SET user_id=EXCLUDED.user_id,channel_id=EXCLUDED.channel_id,target_chat_id=EXCLUDED.target_chat_id,alert_types=EXCLUDED.alert_types,severity_min=EXCLUDED.severity_min,enabled=EXCLUDED.enabled;

COMMIT;
