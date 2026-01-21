<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	let {
		label,
		value = $bindable<string | null>(null),
		options = [],
		placeholder = 'Search...',
		required = false,
		disabled = false,
		error = null
	} = $props<{
		label: string;
		value?: string | null;
		options?: Array<{ id: string; label: string; sublabel?: string }>;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		error?: string | null;
	}>();

	const dispatch = createEventDispatcher<{ select: string | null }>();

	let searchTerm = $state('');
	let isOpen = $state(false);

	const filtered = $derived(
		searchTerm
			? options.filter((opt) =>
					opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
					opt.sublabel?.toLowerCase().includes(searchTerm.toLowerCase())
			  )
			: options
	);

	const selectedOption = $derived(
		value ? options.find((opt) => opt.id === value) || null : null
	);

	function selectOption(option: typeof options[0]) {
		value = option.id;
		isOpen = false;
		searchTerm = '';
		dispatch('select', option.id);
	}

	function clear() {
		value = null;
		searchTerm = '';
		dispatch('select', null);
	}

	function handleBlur(event: FocusEvent) {
		// Delay to allow click on dropdown
		setTimeout(() => {
			if (!event.currentTarget?.contains(document.activeElement)) {
				isOpen = false;
				searchTerm = '';
			}
		}, 200);
	}
</script>

<div class="relative">
	<label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
		{label}
		{#if required}<span class="text-red-500">*</span>{/if}
	</label>

	<div class="relative" on:blur={handleBlur}>
		<!-- Display / Search Input -->
		<div class="relative">
			<input
				type="text"
				class="bg-gray-50 border {error ? 'border-red-500' : 'border-gray-300'} text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
				placeholder={selectedOption ? selectedOption.label : placeholder}
				bind:value={searchTerm}
				on:focus={() => (isOpen = true)}
				{disabled}
			/>
			
			<!-- Clear/Dropdown Icon -->
			<div class="absolute inset-y-0 right-0 flex items-center pr-3">
				{#if selectedOption && !disabled}
					<button
						type="button"
						class="text-gray-400 hover:text-gray-600"
						on:click={clear}
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{:else}
					<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				{/if}
			</div>
		</div>

		<!-- Dropdown -->
		{#if isOpen && !disabled}
			<div class="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
				{#if filtered.length === 0}
					<div class="p-4 text-sm text-gray-500 text-center">No results found</div>
				{:else}
					{#each filtered as option}
						<button
							type="button"
							class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex flex-col"
							on:click={() => selectOption(option)}
						>
							<span class="text-sm font-medium text-gray-900 dark:text-white">{option.label}</span>
							{#if option.sublabel}
								<span class="text-xs text-gray-500 dark:text-gray-400">{option.sublabel}</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		{/if}
	</div>

	{#if error}
		<p class="mt-2 text-sm text-red-600 dark:text-red-500">{error}</p>
	{/if}
</div>
