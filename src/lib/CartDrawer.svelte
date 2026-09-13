<script lang="ts">
	import {
		cart,
		updateQuantity,
		removeItem,
		removeReplacement,
		clearCart,
		clearStoreCart,
		switchStoreCart,
		totalItems,
		totalPrice
	} from './cart.svelte';
	import { goto } from '$app/navigation';
	import { buildCartQuery } from './cartUrl';
	import GroceryItemModal from './GroceryItemModal.svelte';
	import ReplacementModal from './ReplacementModal.svelte';

	let { open, onClose } = $props();

	const itemCount = $derived(totalItems());
	const subtotal = $derived(totalPrice());

	// Secondary carts: exclude the active store (prevents it rendering twice) and
	// any entry with no items.
	const secondaryCarts = $derived(
		Object.values(cart.otherCarts).filter(
			(c) => c.brandId !== cart.storeId && (c.items || []).length > 0
		)
	);

	let viewItem = $state<any>(null);
	let viewBackup = $state<any>(null);

	const storeObj = $derived(
		cart.storeId || cart.storeName
			? { id: cart.storeId, name: cart.storeName, logo: cart.storeLogo }
			: null
	);

	function openItem(item: any) {
		onClose?.();
		viewItem = item
			? {
					...item,
					id: item.productId || item.id,
					raw_image_url: item.image || item.raw_image_url || '',
					image: item.image || ''
				}
			: null;
	}

	function openBackup(item: any) {
		onClose?.();
		viewBackup = item;
	}

	function goToCheckout() {
		onClose();
		window.location.href = '/checkout?' + buildCartQuery(cart.items, cart.storeId, cart.storeName, cart.storeLogo);
	}
</script>

<div
	class={`fixed top-0 right-0 bottom-0 z-[95] flex w-full flex-col bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl transition-transform duration-300 sm:w-[420px] ${open ? 'translate-x-0' : 'translate-x-full'}`}
>
	<!-- Header -->
	<div class="flex flex-shrink-0 items-center justify-between border-b border-gray-200 p-4">
		<div class="flex min-w-0 items-center gap-2.5">
			{#if cart.storeLogo}
				<img
					src={cart.storeLogo}
					alt={cart.storeName}
					class="h-9 w-9 flex-shrink-0 rounded-full object-contain ring-1 ring-black/5"
				/>
			{:else if cart.storeName}
				<div
					class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white ring-1 ring-black/5"
				>
					{(cart.storeName || 'S').charAt(0)}
				</div>
			{/if}
			<div class="min-w-0">
				<h2 class="text-lg font-bold text-gray-900">Your Cart</h2>
				{#if cart.storeName}<p class="mt-0.5 truncate text-xs text-gray-500">
						from {cart.storeName}
					</p>{/if}
			</div>
		</div>
		<button
			onclick={onClose}
			class="cursor-pointer rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/></svg
			>
		</button>
	</div>

	{#if cart.items.length === 0}
		<div class="flex flex-1 flex-col items-center justify-center p-6 text-center">
			<div class="mb-4 text-5xl">🛒</div>
			<h3 class="text-lg font-bold text-gray-900">Your cart is empty</h3>
			<p class="mt-1 text-sm text-gray-500">Add items from a store to get started</p>
			<button
				onclick={onClose}
				class="mt-4 cursor-pointer rounded-full bg-orange-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600"
				>Browse stores</button
			>
		</div>
	{:else}
		<!-- Items -->
		<div class="flex-1 space-y-3 overflow-y-auto p-4">
			{#each cart.items as item, i (item.productId)}
				<div class="rounded-xl bg-gray-50">
					<div
						onclick={() => openItem(item)}
						class="flex cursor-pointer items-center gap-3 p-3 transition active:bg-gray-100"
					>
						<div class="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-white">
							{#if item.image}
								<img src={item.image} alt={item.name} class="h-full w-full object-contain" />
							{:else}
								<div class="flex h-full w-full items-center justify-center text-gray-300">📦</div>
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-semibold text-gray-900">{item.name}</p>
							<p class="mt-0.5 text-sm font-bold text-orange-500">
								${(Number(item.price) * (item.quantity || 1)).toFixed(2)}
							</p>
						</div>
						<div
							onclick={(e) => e.stopPropagation()}
							class="flex flex-shrink-0 items-center gap-1.5"
						>
							<button
								onclick={() => updateQuantity(item.productId, (item.quantity || 1) - 1)}
								class="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 active:scale-90"
							>
								<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M20 12H4"
									/></svg
								>
							</button>
							<span class="w-7 text-center text-sm font-semibold">{item.quantity || 1}</span>
							<button
								onclick={() => updateQuantity(item.productId, (item.quantity || 1) + 1)}
								class="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 active:scale-90"
							>
								<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 4v16m8-8H4"
									/></svg
								>
							</button>
							<button
								onclick={() => removeItem(item.productId)}
								class="p-1.5 text-gray-400 transition hover:text-red-500"
							>
								<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/></svg
								>
							</button>
						</div>
					</div>

					{#if item.replacements?.length}
						<div class="mx-3 mb-3 border-l-2 border-dashed border-orange-200 pl-3">
							<div class="mt-1 mb-2 flex items-center gap-1.5">
								<svg
									class="h-3.5 w-3.5 text-orange-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/></svg
								>
								<span class="text-[10px] font-bold tracking-wider text-orange-600 uppercase"
									>Backup choice</span
								>
								<span class="text-[10px] text-gray-400">· Substitute if out of stock</span>
							</div>
							{#each item.replacements as r}
								<div
									onclick={() => openBackup(item)}
									class="mb-1.5 flex cursor-pointer items-center gap-2 rounded-lg border border-gray-100 bg-white/70 px-2.5 py-2 transition last:mb-0 active:bg-gray-100"
								>
									<div class="h-8 w-8 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
										{#if r.image}
											<img src={r.image} alt={r.name} class="h-full w-full object-contain" />
										{:else}
											<div
												class="flex h-full w-full items-center justify-center text-sm text-gray-300"
											>
												📦
											</div>
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										<p class="truncate text-xs font-medium text-gray-800">
											{r.name || 'Backup item'}
										</p>
										{#if r.price != null}
											<p class="text-[11px] text-gray-500">
												Charged only if substituted: ${Number(r.price || 0).toFixed(2)}
											</p>
										{/if}
									</div>
									<button
										onclick={(e) => {
											e.stopPropagation();
											removeReplacement(item.productId, r.id);
										}}
										class="flex-shrink-0 text-[11px] font-medium text-gray-400 transition hover:text-red-500"
										>Remove</button
									>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}

			{#if cart.isLoggedIn && secondaryCarts.length > 0}
				<div class="mt-5 border-t border-gray-200 pt-4">
					<p class="mb-3 text-xs font-bold tracking-wider text-gray-500 uppercase">
						Your Other Shopping Carts
					</p>
					<div class="space-y-2.5">
						{#each secondaryCarts as oc (oc.brandId)}
							{@const ocCount = (oc.items || []).reduce(
								(s: number, i: any) => s + (i.quantity || 1),
								0
							)}
							{@const ocSubtotal = (oc.items || []).reduce(
								(s: number, i: any) => s + (Number(i.price) || 0) * (i.quantity || 1),
								0
							)}
							<div class="rounded-xl bg-gray-50 p-3">
								<div class="flex items-center gap-3">
									<div
										class="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-black/5"
									>
										{#if oc.brandLogo}
											<img
												src={oc.brandLogo}
												alt={oc.brandName}
												class="h-full w-full object-contain"
											/>
										{:else}
											<div
												class="flex h-full w-full items-center justify-center font-bold text-gray-300"
											>
												📦
											</div>
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-semibold text-gray-900">
											{oc.brandName || 'Store'}
										</p>
										<p class="text-xs text-gray-500">
											{ocCount}
											{ocCount === 1 ? 'item' : 'items'} • ${ocSubtotal.toFixed(2)}
										</p>
									</div>
									<button
										onclick={() => clearStoreCart(oc.brandId)}
										class="flex-shrink-0 text-xs font-medium text-gray-400 transition hover:text-red-500"
										>Clear</button
									>
								</div>
								{#if (oc.items || []).length}
									<div class="mt-2 flex items-center gap-1.5">
										{#each (oc.items || []).slice(0, 3) as ci}
											<div
												class="h-9 w-9 flex-shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-black/5"
											>
												{#if ci.image}
													<img src={ci.image} alt={ci.name} class="h-full w-full object-contain" />
												{:else}
													<div
														class="flex h-full w-full items-center justify-center text-xs text-gray-300"
													>
														📦
													</div>
												{/if}
											</div>
										{/each}
										<div class="flex-1"></div>
									</div>
								{/if}
								<button
									onclick={() => {
										void switchStoreCart(oc.brandId);
										onClose();
										goto('/gstore/' + oc.brandId);
									}}
									class="mt-2 w-full cursor-pointer rounded-lg border border-orange-300 bg-white py-2 text-xs font-bold whitespace-nowrap text-orange-600 transition active:scale-[0.98]"
									>{oc.brandName ? `Switch to ${oc.brandName}` : 'Switch Store'}</button
								>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Summary + Checkout -->
		<div class="flex-shrink-0 space-y-3 border-t border-gray-200 bg-white p-4">
			<!-- <div class="flex items-center justify-between">
				<button onclick={clearCart} class="text-xs font-medium text-red-500 hover:text-red-600"
					>Clear cart</button
				>
			</div> -->
			<div class="space-y-1.5 text-sm">
				<div class="flex justify-between text-black">
					<span>Subtotal ({itemCount} items)</span>
					<span>${subtotal.toFixed(2)}</span>
				</div>
				<div class="flex justify-between text-black">
					<span>Delivery fee</span>
					<span>TBD</span>
				</div>
				<div class="flex justify-between border-t border-gray-100 pt-2 font-bold text-gray-900">
					<span>Totalclear cart</span>
					<span>${subtotal.toFixed(2)}</span>
				</div>
			</div>
			<button
				onclick={goToCheckout}
				class="w-full cursor-pointer rounded-xl bg-orange-700 py-3 text-sm font-bold text-white shadow-md transition hover:bg-orange-800 active:scale-[0.98]"
				>Go to Checkout
			</button>
		</div>
	{/if}
</div>

{#if viewItem && storeObj}
	<GroceryItemModal
		item={viewItem}
		store={storeObj}
		recommended={[]}
		onOpenItem={(it) => openItem(it)}
		onClose={() => (viewItem = null)}
	/>
{/if}

{#if viewBackup && storeObj}
	<ReplacementModal
		item={viewBackup}
		store={storeObj}
		recommended={viewBackup.recommended || []}
		initialReplacements={viewBackup.replacements || []}
		initialNote={viewBackup.note || ''}
		onBack={() => (viewBackup = null)}
		onClose={() => (viewBackup = null)}
		onCommit={(replacements, note) => {
			const ex = cart.items.find((i) => i.productId === viewBackup.productId);
			if (ex) {
				ex.replacements = replacements;
				if (note !== undefined) ex.note = note;
			}
			viewBackup = null;
		}}
	/>
{/if}
