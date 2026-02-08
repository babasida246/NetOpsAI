<script lang="ts">
  import { Badge } from 'flowbite-svelte';
  import type { Severity, RiskTier, ChangeStatus, Vendor, DeviceRole } from '../types';
  
  interface Props {
    type: 'severity' | 'risk' | 'status' | 'vendor' | 'role';
    value: Severity | RiskTier | ChangeStatus | Vendor | DeviceRole;
  }
  
  let { type, value }: Props = $props();
  
  function getColor() {
    if (type === 'severity') {
      const colors: Record<Severity, string> = {
        critical: 'red',
        high: 'yellow',
        med: 'yellow',
        low: 'green'
      };
      return colors[value as Severity] || 'dark';
    }
    
    if (type === 'risk') {
      const colors: Record<RiskTier, string> = {
        high: 'red',
        med: 'yellow',
        low: 'green'
      };
      return colors[value as RiskTier] || 'dark';
    }
    
    if (type === 'status') {
      const colors: Record<string, string> = {
        draft: 'dark',
        planned: 'blue',
        candidate_ready: 'yellow',
        verified: 'indigo',
        waiting_approval: 'purple',
        approved: 'green',
        deploying: 'blue',
        deployed: 'green',
        verified_post: 'green',
        closed: 'dark',
        rejected: 'red',
        failed: 'red',
        rolled_back: 'yellow',
        needs_fix: 'red'
      };
      return colors[value as string] || 'dark';
    }
    
    if (type === 'vendor') {
      const colors: Record<Vendor, string> = {
        cisco: 'blue',
        mikrotik: 'purple',
        fortigate: 'red'
      };
      return colors[value as Vendor] || 'dark';
    }
    
    if (type === 'role') {
      return 'dark';
    }
    
    return 'dark';
  }
</script>

<Badge color={getColor() as 'red' | 'yellow' | 'green' | 'purple' | 'blue' | 'dark' | 'primary' | 'indigo' | 'pink' | 'none'} class="capitalize">
  {value}
</Badge>
