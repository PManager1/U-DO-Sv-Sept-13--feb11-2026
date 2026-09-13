<script lang="ts">
	import { onMount } from 'svelte';
	import { slugify } from './slug';
	import { cart, addToCart, updateQuantity, removeItem, extractImages } from './cart.svelte';

	let {
		item,
		store,
		onOpen,
		widthClass = ''
	}: {
		item: any;
		store: any;
		onOpen: (item: any) => void;
		widthClass?: string;
	} = $props();

	const isAvailable = item.available !== false;
	const productId = item.id || slugify(item.name);
	const qty = $derived(cart.items.find((i) => i.productId === productId)?.quantity || 0);
	let isEditing = $state(false);
	let cardEl = $state<HTMLDivElement>();

	onMount(() => {
		const onDown = (e: MouseEvent) => {
			if (cardEl && !cardEl.contains(e.target as Node)) isEditing = false;
		};
		document.addEventListener('mousedown', onDown);
		return () => document.removeEventListener('mousedown', onDown);
	});

	// Thumbnail image: explicit 400 size, else last image, else raw_image_url.
	const displayImage = $derived(
		(item.images || []).find((img: any) => img.size === '400')?.url ||
			(item.images && item.images.length > 0 ? item.images[item.images.length - 1].url : '') ||
			item.raw_image_url ||
			''
	);

	function addOne() {
		addToCart(store, {
			id: productId,
			name: item.name,
			price: item.price,
			images: extractImages(item),
			image: displayImage
		});
		isEditing = true;
	}
	function dec() {
		if (qty === 1) removeItem(productId);
		else updateQuantity(productId, qty - 1);
	}
</script>

<div
	bind:this={cardEl}
	onclick={() => onOpen(item)}
	class={`${widthClass} relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white transition hover:border-gray-200 hover:shadow-md ${isAvailable ? '' : 'pointer-events-none opacity-50'}`}
>
	<div class="relative flex h-[156px] items-center justify-center bg-white">
		{#if displayImage}
			<img
				src={displayImage}
				alt={item.name}
				class="max-h-full max-w-full object-contain"
				loading="lazy"
			/>
		{:else}
			<div class="flex h-full w-full items-center justify-center text-2xl text-gray-900">🥟</div>
		{/if}

		{#if !isAvailable}
			<div class="absolute inset-0 flex items-center justify-center bg-black/40">
				<span class="rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white"
					>Out of Stock</span
				>
			</div>
		{/if}

		{#if isAvailable}
			{#if qty === 0}
				<button
					onclick={(e) => {
						e.stopPropagation();
						addOne();
					}}
					aria-label="Add {item.name} to cart"
					class="absolute right-2 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-orange-500 px-[18px] py-2 text-[15px] font-semibold text-white shadow-md transition hover:bg-orange-600 active:scale-95"
					style="bottom:calc(80% - 8px)"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/></svg
					>
					Add
				</button>
			{:else if isEditing}
				<div
					onclick={(e) => e.stopPropagation()}
					style="bottom:calc(80% - 8px)"
					class="absolute right-2 flex items-center rounded-full bg-orange-500 text-white shadow-md"
				>
					<button
						onclick={dec}
						class="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-l-full text-lg hover:bg-orange-600"
						title="Remove">−</button
					>
					<span class="min-w-[52px] text-center text-[17px] font-bold">{qty} ct</span>
					<button
						onclick={addOne}
						class="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-r-full text-lg hover:bg-orange-600"
						title="Add">+</button
					>
				</div>
			{:else}
				<button
					onclick={(e) => {
						e.stopPropagation();
						isEditing = true;
					}}
					style="bottom:calc(80% - 8px)"
					class="absolute right-2 inline-flex cursor-pointer items-center justify-center rounded-full bg-orange-500 px-5 py-2 text-[15px] font-semibold text-white shadow-md transition hover:bg-orange-600 active:scale-95"
					>{qty} ct</button
				>
			{/if}
		{/if}
	</div>

	<div class="p-2.5">
		<p class="text-xs font-medium text-gray-900">${Number(item.price).toFixed(2)}</p>
		<p class="mt-0.5 line-clamp-2 text-sm leading-tight font-semibold text-gray-900">{item.name}</p>
		{#if item.description}
			<p class="mt-0.5 line-clamp-2 text-xs text-gray-900">{item.description}</p>
		{/if}
	</div>
</div>
