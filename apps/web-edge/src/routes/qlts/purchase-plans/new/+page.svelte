<script lang="ts">
  import { _, isLoading } from '$lib/i18n';
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="mb-4">
    <h1 class="text-2xl font-semibold tracking-tight">{$isLoading ? 'New Purchase Plan' : $_('qlts.purchasePlansNew.title')}</h1>
    <p class="text-sm text-slate-500">{$isLoading ? 'Create a new purchase plan.' : $_('qlts.purchasePlansNew.subtitle')}</p>
  </div>

  <div class="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
    {$isLoading ? 'Form coming soon.' : $_('qlts.purchasePlansNew.empty')}
  </div>
</div>
