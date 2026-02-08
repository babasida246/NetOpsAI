<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button } from 'flowbite-svelte';
  import { ArrowLeft } from 'lucide-svelte';
  import { _, isLoading } from '$lib/i18n';
  import WorkflowRequestForm from '$lib/assets/components/WorkflowRequestForm.svelte';

  function handleSubmitted() {
    goto('/requests');
  }
</script>

<div class="page-shell page-content py-6 lg:py-8">
  <div class="mb-4">
    <Button color="alternative" href="/requests">
      <ArrowLeft class="w-4 h-4 mr-2" /> {$isLoading ? 'Back' : $_('common.back')}
    </Button>
  </div>
  <h1 class="text-2xl font-semibold mb-6">{$isLoading ? 'New Workflow Request' : $_('requests.newTitle')}</h1>
  <WorkflowRequestForm onsubmitted={handleSubmitted} />
</div>
