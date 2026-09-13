 <script lang="ts">
  let { items = [] }: { items: { label: string; href?: string }[] } = $props();
</script>

<nav aria-label="Breadcrumb" class="mb-3">
  <ol class="flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
    {#each items as item, i}
      <li class="flex items-center gap-1.5">
        {#if i > 0}<span class="text-gray-400">/</span>{/if}
        {#if item.href && i < items.length - 1}
          <a href={item.href} class="font-medium text-orange-600 hover:text-orange-700 hover:underline">
            {item.label}
          </a>
        {:else}
          <span class="font-semibold text-gray-900">{item.label}</span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>