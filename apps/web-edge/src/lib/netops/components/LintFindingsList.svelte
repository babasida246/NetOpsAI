<script lang="ts">
  import { Alert } from 'flowbite-svelte';
  import type { LintFinding } from '../types';
  import { severityOrder } from '../utils/format';
  import StatusBadge from './StatusBadge.svelte';
  
  interface Props {
    findings: LintFinding[];
  }
  
  let { findings }: Props = $props();
  
  const groupedFindings = $derived(() => {
    const grouped: Record<string, LintFinding[]> = {
      critical: [],
      high: [],
      med: [],
      low: []
    };
    
    findings.forEach(finding => {
      if (grouped[finding.severity]) {
        grouped[finding.severity].push(finding);
      }
    });
    
    return Object.entries(grouped)
      .filter(([_, items]) => items.length > 0)
      .sort((a, b) => severityOrder(a[0] as any) - severityOrder(b[0] as any));
  });
</script>

{#if findings.length === 0}
  <Alert color="green">
    <span class="font-semibold">No issues found!</span>
    All lint checks passed.
  </Alert>
{:else}
  <div class="space-y-4">
    {#each groupedFindings() as [severity, items]}
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div class="flex items-center gap-2 mb-3">
          <StatusBadge type="severity" value={severity as any} />
          <span class="font-semibold">{items.length} {items.length === 1 ? 'issue' : 'issues'}</span>
        </div>
        
        <div class="space-y-2">
          {#each items as finding}
            <div class="pl-4 border-l-2 border-gray-300 dark:border-gray-600">
              <div class="font-medium text-sm">{finding.rule_name}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">{finding.message}</div>
              {#if finding.path}
                <div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Path: {finding.path}
                  {#if finding.line}
                    (line {finding.line})
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}
