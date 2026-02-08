<script lang="ts">
  import { Badge } from 'flowbite-svelte';

  type Tone = 'warning' | 'danger' | 'info' | 'success';

  const { label, tone = 'warning' } = $props<{
    label: string;
    tone?: Tone;
  }>();

  const color = $derived.by(() =>
    tone === 'danger'
      ? 'red'
      : tone === 'success'
        ? 'green'
        : tone === 'info'
          ? 'blue'
          : 'yellow'
  );
</script>

<Badge color={color} class="text-xs font-semibold">{label}</Badge>
