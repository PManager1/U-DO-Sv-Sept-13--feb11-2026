<script lang="ts">
	import API_BASE from '$lib/api';

	let { brand, brandId } = $props();

	let requiresSpecialInstructions = $state(brand?.requiresSpecialInstructions ?? false);
	let specialInstructionsText = $state(brand?.specialInstructionsText ?? '');
	let requiresUdoPayment = $state(brand?.requiresUdoPayment ?? false);
	let udoPaymentText = $state(brand?.udoPaymentText ?? '');
	let saving = $state(false);
	let saved = $state(false);

	// sync when the brand prop changes
	$effect(() => {
		if (!brand) return;
		requiresSpecialInstructions = brand.requiresSpecialInstructions ?? false;
		specialInstructionsText = brand.specialInstructionsText ?? '';
		requiresUdoPayment = brand.requiresUdoPayment ?? false;
		udoPaymentText = brand.udoPaymentText ?? '';
	});

	async function handleSave() {
		saving = true;
		saved = false;
		try {
			const res = await fetch(API_BASE + `admin/brands/${brandId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ requiresSpecialInstructions, specialInstructionsText, requiresUdoPayment, udoPaymentText })
			});
			if (res.ok) {
				saved = true;
				setTimeout(() => (saved = false), 3000);
			} else {
				const d = await res.json();
				alert('Save failed: ' + (d.message || res.status));
			}
		} catch (err: any) {
			alert('Network error: ' + err.message);
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="bg-white rounded-xl border border-gray-200 p-5">
		<h3 class="font-semibold text-gray-900 mb-4">📝 Special Instructions</h3>

		<label class="flex items-center gap-3 cursor-pointer mb-3">
			<input type="checkbox" bind:checked={requiresSpecialInstructions} class="w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
			<span class="text-sm text-gray-700">Requires special instructions for this store ?</span>
		</label>

		<textarea bind:value={specialInstructionsText} placeholder="Enter special instructions for drivers..." class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 min-h-[80px] mb-4"></textarea>

		<label class="flex items-center gap-3 cursor-pointer mb-3">
			<input type="checkbox" bind:checked={requiresUdoPayment} class="w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
			<span class="text-sm text-gray-700">Requires payment through U-DO card.</span>
		</label>

		<textarea bind:value={udoPaymentText} placeholder="Enter payment instructions..." class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 min-h-[80px] mb-4"></textarea>

		<div class="mt-4 flex items-center gap-3">
			<button onclick={handleSave} disabled={saving} class="bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-wait text-sm font-medium">{saving ? 'Saving...' : 'Save'}</button>
			{#if saved}<span class="text-sm text-green-600 font-medium">Saved ✓</span>{/if}
		</div>
	</div>
</div>
