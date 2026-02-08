<script lang="ts">
  import { Card } from 'flowbite-svelte';
  import { BookOpen, ShieldCheck, Wrench } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="max-w-3xl space-y-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
        {$isLoading ? 'Help & Docs' : $_('help.title')}
      </h1>
      <p class="text-sm text-slate-500 dark:text-slate-300">
        {$isLoading ? 'Quick references for operators and field engineers.' : $_('help.subtitle')}
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <Card size="none" class="p-5 space-y-2">
        <BookOpen class="h-5 w-5 text-blue-600" />
        <div class="font-semibold text-slate-900 dark:text-white">
          {$isLoading ? 'Getting started' : $_('help.gettingStarted.title')}
        </div>
        <div class="text-sm text-slate-500">
          {$isLoading ? 'Login, navigation, and basic workflows.' : $_('help.gettingStarted.subtitle')}
        </div>
      </Card>

      <Card size="none" class="p-5 space-y-2">
        <Wrench class="h-5 w-5 text-blue-600" />
        <div class="font-semibold text-slate-900 dark:text-white">
          {$isLoading ? 'Tools' : $_('help.tools.title')}
        </div>
        <div class="text-sm text-slate-500">
          {$isLoading ? 'CLI generator, SSH terminal, and Field Kit.' : $_('help.tools.subtitle')}
        </div>
      </Card>

      <Card size="none" class="p-5 space-y-2">
        <ShieldCheck class="h-5 w-5 text-blue-600" />
        <div class="font-semibold text-slate-900 dark:text-white">
          {$isLoading ? 'Security' : $_('help.security.title')}
        </div>
        <div class="text-sm text-slate-500">
          {$isLoading ? 'Audit, approvals, and safe-by-default operations.' : $_('help.security.subtitle')}
        </div>
      </Card>
    </div>

    <Card size="none" class="p-5 space-y-2">
      <div class="text-xs uppercase tracking-wide text-slate-400 font-semibold">
        {$isLoading ? 'Notes' : $_('help.notesTitle')}
      </div>
      <ul class="list-disc list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1">
        <li>{$isLoading ? 'All privileged actions require audit trails.' : $_('help.notes.audit')}</li>
        <li>{$isLoading ? 'Production changes should use approvals.' : $_('help.notes.approvals')}</li>
        <li>{$isLoading ? 'Use the Field Kit for guided, safe troubleshooting.' : $_('help.notes.fieldKit')}</li>
      </ul>
    </Card>
  </div>
</div>

