export const FEATURE_CATALOG = [
    { key: 'asset.core', name: 'Asset Core', tier: 'core' },
    { key: 'cmdb.core', name: 'CMDB Core', tier: 'core' },
    { key: 'warehouse.core', name: 'Warehouse Core', tier: 'core' },
    { key: 'maintenance.core', name: 'Maintenance Core', tier: 'core' },
    { key: 'chat.core', name: 'Chat Core', tier: 'core' },
    { key: 'asset.depreciation', name: 'Asset Depreciation', tier: 'pro' },
    { key: 'asset.audit', name: 'Asset Audit', tier: 'pro' },
    { key: 'cmdb.impact', name: 'CMDB Impact', tier: 'pro' },
    { key: 'integration.zabbix', name: 'Zabbix Integration', tier: 'pro' },
    { key: 'workflow.engine', name: 'Workflow Engine', tier: 'pro' },
    { key: 'netops.backup', name: 'NetOps Backup', tier: 'netops' },
    { key: 'netops.compliance', name: 'NetOps Compliance', tier: 'netops' },
    { key: 'netops.topology', name: 'NetOps Topology', tier: 'netops' },
    { key: 'netops.push_config', name: 'NetOps Push Config', tier: 'netops' },
    { key: 'sam.catalog', name: 'SAM Catalog', tier: 'sam' },
    { key: 'sam.allocation', name: 'SAM Allocation', tier: 'sam' },
    { key: 'sam.reconcile', name: 'SAM Reconcile', tier: 'sam' },
    { key: 'sam.usage_metering', name: 'SAM Usage Metering', tier: 'sam' },
    { key: 'sam.renewals', name: 'SAM Renewals', tier: 'sam' },
    { key: 'ai.multi_provider', name: 'AI Multi Provider', tier: 'ai' },
    { key: 'ai.routing', name: 'AI Routing', tier: 'ai' },
    { key: 'ai.tools', name: 'AI Tools', tier: 'ai' },
    { key: 'ai.cost_control', name: 'AI Cost Control', tier: 'ai' }
] as const

export type FeatureKey = typeof FEATURE_CATALOG[number]['key']
