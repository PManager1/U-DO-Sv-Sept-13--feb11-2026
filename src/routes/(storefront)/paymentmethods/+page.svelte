<script lang="ts">
	import PaymentMethodsModal from '$lib/PaymentMethodsModal.svelte';

	let open = $state(true);

	function onBack() {
		history.back();
	}
</script>

<svelte:head>
	<title>Payment Methods</title>
</svelte:head>

<div class="mt-16 flex flex-col items-center text-center">
	<h1 class="text-3xl font-extrabold text-ink">Payment Methods / Wallet</h1>
	<p class="mt-3 max-w-md text-ink-soft">
		A dialog is open for you to add or select a payment method. Choose one to continue.
	</p>
</div>

<PaymentMethodsModal {open} onClose={onBack} onSelect={onBack} />
