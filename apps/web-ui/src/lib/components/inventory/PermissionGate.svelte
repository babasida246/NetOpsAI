<script lang="ts">
	import { hasPermission, type Permission } from '$lib/stores/permissionStore';
	
	let {
		permission,
		orgId = undefined,
		warehouseId = undefined,
		fallback = 'hide'
	} = $props<{
		permission: Permission;
		orgId?: string | undefined;
		warehouseId?: string | undefined;
		fallback?: 'hide' | 'disable' | 'show';
	}>();

	const allowed = $derived(hasPermission(permission, orgId, warehouseId));
</script>

{#if allowed}
	<slot />
{:else if fallback === 'disable'}
	<div class="pointer-events-none opacity-50">
		<slot />
	</div>
{:else if fallback === 'show'}
	<div class="opacity-50" title="You don't have permission for this action">
		<slot />
	</div>
{/if}
