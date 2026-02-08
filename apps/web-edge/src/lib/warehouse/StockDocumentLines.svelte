<script lang="ts">
  import { _, isLoading } from '$lib/i18n';
  import type { SparePartRecord, StockDocumentLine } from '$lib/api/warehouse';

  let {
    lines = $bindable<StockDocumentLine[]>([]),
    parts = [],
    docType,
    readonly = false
  } = $props<{
    lines?: StockDocumentLine[];
    parts?: SparePartRecord[];
    docType: 'receipt' | 'issue' | 'adjust' | 'transfer';
    readonly?: boolean;
  }>();

  const partOptions = $derived(
    parts.map((part: SparePartRecord) => ({ id: part.id, label: `${part.partCode} - ${part.name}` }))
  );

  function addLine() {
    const next: StockDocumentLine = {
      partId: '',
      qty: 1,
      unitCost: docType === 'issue' ? undefined : 0,
      adjustDirection: docType === 'adjust' ? 'plus' : undefined
    };
    lines = [...lines, next];
  }

  function removeLine(index: number) {
    lines = lines.filter((_: StockDocumentLine, i: number) => i !== index);
  }

  function updateLine<K extends keyof StockDocumentLine>(index: number, field: K, value: StockDocumentLine[K]) {
    const next = [...lines];
    next[index] = { ...next[index], [field]: value };
    lines = next;
  }

  function getPartLabel(partId: string) {
    return partOptions.find((part: { id: string; label: string }) => part.id === partId)?.label ?? partId;
  }
</script>

<div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
  <table class="min-w-full text-sm text-left text-slate-700 dark:text-slate-200">
    <thead class="bg-slate-50 dark:bg-slate-800 text-xs uppercase">
      <tr>
        <th class="px-3 py-2">{$isLoading ? 'Part' : $_('warehouse.part')}</th>
        <th class="px-3 py-2">{$isLoading ? 'Qty' : $_('warehouse.qty')}</th>
        <th class="px-3 py-2">{$isLoading ? 'Unit Cost' : $_('warehouse.unitCost')}</th>
        <th class="px-3 py-2">{$isLoading ? 'Serial' : $_('warehouse.serial')}</th>
        {#if docType === 'adjust'}
          <th class="px-3 py-2">{$isLoading ? 'Direction' : $_('warehouse.direction')}</th>
        {/if}
        <th class="px-3 py-2">{$isLoading ? 'Note' : $_('warehouse.note')}</th>
        {#if !readonly}
          <th class="px-3 py-2 w-10"></th>
        {/if}
      </tr>
    </thead>
    <tbody>
      {#if lines.length === 0}
        <tr>
          <td class="px-3 py-6 text-center text-slate-500" colspan={docType === 'adjust' ? 6 : 5}>
            {$isLoading ? 'No lines added.' : $_('warehouse.noLines')}
          </td>
        </tr>
      {/if}
      {#each lines as line, index}
        <tr class="border-t border-slate-200 dark:border-slate-700">
          <td class="px-3 py-2">
            {#if readonly}
              {getPartLabel(line.partId)}
            {:else}
              <select
                class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-600"
                value={line.partId}
                onchange={(event) => updateLine(index, 'partId', (event.currentTarget as HTMLSelectElement).value)}
              >
                <option value="">{$isLoading ? 'Select part' : $_('warehouse.selectPart')}</option>
                {#each partOptions as part}
                  <option value={part.id}>{part.label}</option>
                {/each}
              </select>
            {/if}
          </td>
          <td class="px-3 py-2">
            {#if readonly}
              {line.qty}
            {:else}
              <input
                type="number"
                min="1"
                class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-600"
                value={line.qty}
                oninput={(event) => updateLine(index, 'qty', Number((event.currentTarget as HTMLInputElement).value))}
              />
            {/if}
          </td>
          <td class="px-3 py-2">
            {#if readonly}
              {line.unitCost ?? '-'}
            {:else}
              <input
                type="number"
                min="0"
                step="0.01"
                class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-600"
                value={line.unitCost ?? ''}
                oninput={(event) => {
                  const raw = (event.currentTarget as HTMLInputElement).value;
                  updateLine(index, 'unitCost', raw === '' ? null : Number(raw));
                }}
              />
            {/if}
          </td>
          <td class="px-3 py-2">
            {#if readonly}
              {line.serialNo || '-'}
            {:else}
              <input
                class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-600"
                value={line.serialNo ?? ''}
                oninput={(event) => updateLine(index, 'serialNo', (event.currentTarget as HTMLInputElement).value)}
              />
            {/if}
          </td>
          {#if docType === 'adjust'}
            <td class="px-3 py-2">
              {#if readonly}
                {line.adjustDirection ?? '-'}
              {:else}
                <select
                  class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-600"
                  value={line.adjustDirection ?? 'plus'}
                  onchange={(event) => updateLine(index, 'adjustDirection', (event.currentTarget as HTMLSelectElement).value as 'plus' | 'minus')}
                >
                  <option value="plus">{$isLoading ? 'Plus' : $_('common.plus')}</option>
                  <option value="minus">{$isLoading ? 'Minus' : $_('common.minus')}</option>
                </select>
              {/if}
            </td>
          {/if}
          <td class="px-3 py-2">
            {#if readonly}
              {line.note || '-'}
            {:else}
              <input
                class="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:bg-slate-800 dark:border-slate-600"
                value={line.note ?? ''}
                oninput={(event) => updateLine(index, 'note', (event.currentTarget as HTMLInputElement).value)}
              />
            {/if}
          </td>
          {#if !readonly}
            <td class="px-3 py-2 text-right">
              <button
                type="button"
                class="text-red-600 hover:text-red-700 text-sm"
                onclick={() => removeLine(index)}
              >
                Remove
              </button>
            </td>
          {/if}
        </tr>
      {/each}
    </tbody>
  </table>

  {#if !readonly}
    <div class="border-t border-slate-200 dark:border-slate-700 p-3">
      <button
        type="button"
        class="inline-flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300"
        onclick={addLine}
      >
        + Add line
      </button>
    </div>
  {/if}
</div>
