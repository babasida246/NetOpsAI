<script lang="ts">
  import { goto } from '$app/navigation';

  $effect(() => {
    void goto('/warehouse/stock');
  });
</script>
