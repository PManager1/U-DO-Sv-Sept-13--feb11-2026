<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		id,
		title,
		description = '',
		icon,
		iconBg = '',
		badge = '',
		badgeColor = '',
		badgeBg = '',
		linkTo = '',
		linkHref = '',
		linkLabel = '',
		linkTo2 = '',
		linkHref2 = '',
		linkLabel2 = '',
		expandedCard,
		onToggle,
		hidden = false,
		children
	}: {
		id: string;
		title: string;
		description?: string;
		icon?: Snippet;
		iconBg?: string;
		badge?: string;
		badgeColor?: string;
		badgeBg?: string;
		linkTo?: string;
		linkHref?: string;
		linkLabel?: string;
		linkTo2?: string;
		linkHref2?: string;
		linkLabel2?: string;
		expandedCard: string | null;
		onToggle: (id: string) => void;
		hidden?: boolean;
		children?: Snippet;
	} = $props();

	const isExpanded = $derived(expandedCard === id);
	const hasLink = $derived(!!(linkTo || linkHref || linkTo2 || linkHref2));
</script>

{#if !hidden}
	<div
		onclick={() => onToggle(id)}
		class={`bg-white rounded-xl p-5 border cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg ${isExpanded ? 'border-orange-500 shadow-lg' : 'border-gray-200'}`}
	>
		<div class="flex items-start gap-4">
			{#if icon}
				<div class={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
					{@render icon()}
				</div>
			{/if}
			<div class="flex-1 min-w-0">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold text-gray-900">{title}</h3>
					<svg class={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
				</div>
				<p class="text-sm text-gray-500 mt-1">{description}</p>
				{#if badge}<span class={`inline-block mt-2 text-xs font-medium ${badgeColor} ${badgeBg} px-2 py-1 rounded-full`}>{badge}</span>{/if}
				{#if hasLink}
					<div class="flex flex-wrap items-center gap-3 mt-2">
						{#if linkTo}
							<a href={linkTo} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
								{linkLabel || 'Open Page →'}
							</a>
						{:else if linkHref}
							<a href={linkHref} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
								{linkLabel || 'Open Page →'}
							</a>
						{/if}
						{#if linkTo2}
							<a href={linkTo2} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
								{linkLabel2 || 'Open Page →'}
							</a>
						{:else if linkHref2}
							<a href={linkHref2} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()} class="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 hover:underline">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
								{linkLabel2 || 'Open Page →'}
							</a>
						{/if}
					</div>
				{/if}
			</div>
		</div>
		{#if isExpanded}
			<div class="border-t border-gray-100 mt-4 pt-4 pb-2 overflow-y-auto" style="max-height:70vh">
				{#if children}{@render children()}{/if}
			</div>
		{/if}
	</div>
{/if}
