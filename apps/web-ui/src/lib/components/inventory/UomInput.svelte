<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { UOM } from '$lib/types/inventory';

	let {
		label = 'Quantity',
		quantity = $bindable<number | null>(null),
		uom = $bindable<UOM | null>(null),
		uomCode = null,
		placeholder = '0',
		required = false,
		disabled = false,
		error = null,
		min = null,
		max = null
	} = $props<{
		label?: string;
		quantity?: number | null;
		uom?: UOM | null;
		uomCode?: string | null;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string | null;
		min?: number | null;
		max?: number | null;
	}>();

	const dispatch = createEventDispatcher<{ change: { quantity: number | null; uom: UOM | null } }>();

	const displayUOM = $derived(uom?.code || uomCode || '');
	const precision = $derived(uom?.precision ?? 0);
	const step = $derived(precision > 0 ? Math.pow(10, -precision) : 1);

	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const numValue = input.value ? parseFloat(input.value) : null;
		quantity = numValue;
		dispatch('change', { quantity: numValue, uom });
	}
</script>

<div>
	<label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
		{label}
		{#if required}<span class="text-red-500">*</span>{/if}
	</label>

	<div class="relative">
		<input
			type="number"
			class="bg-gray-50 border {error ? 'border-red-500' : 'border-gray-300'} text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full {displayUOM ? 'pr-16' : 'pr-2.5'} p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
			{placeholder}
			{disabled}
			{required}
			min={min !== null ? min : undefined}
			max={max !== null ? max : undefined}
			{step}
			value={quantity !== null ? quantity : ''}
			on:input={handleInput}
		/>

		<!-- UOM Code Suffix -->
		{#if displayUOM}
			<div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
				<span class="text-gray-500 dark:text-gray-400 font-medium text-xs">{displayUOM}</span>
			</div>
		{/if}
	</div>

	{#if error}
		<p class="mt-2 text-sm text-red-600 dark:text-red-500">{error}</p>
	{/if}
</div>
