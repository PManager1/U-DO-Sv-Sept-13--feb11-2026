<script lang="ts">
	let { open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (label: string) => void } = $props();

	const OPTIONS = [
		{ id: 'card', label: 'Debit / Credit Card', icon: '💳', hint: 'Visa, Mastercard, Amex, Discover' },
		{ id: 'venmo', label: 'Venmo', icon: '💙', hint: 'Pay with your Venmo balance' },
		{ id: 'paypal', label: 'PayPal', icon: '🅿️', hint: 'Pay with your PayPal account' },
		// { id: 'ebt', label: 'EBT', icon: '🏛️', hint: 'SNAP / EBT card' },
		// { id: 'klarna', label: 'Klarna', icon: '🩷', hint: 'Pay in 4 interest-free' },
		{ id: 'cashapp', label: 'Cash App', icon: '💵', hint: 'Pay with your Cash App balance' }
	];

	let stage = $state('list');
	let form = $state<Record<string, string>>({});

	const expiryError = $derived.by(() => {
		const v = form.expiry || '';
		if (!v || v.length < 5) return '';
		const parts = v.split('/');
		if (parts.length !== 2) return '';
		const mm = parseInt(parts[0], 10);
		const yy = parseInt(parts[1], 10);
		if (isNaN(mm) || isNaN(yy) || mm < 1 || mm > 12) return 'Incorrect expiry date';
		const now = new Date();
		const curYear = now.getFullYear() % 100;
		const curMonth = now.getMonth() + 1;
		if (yy < curYear || (yy === curYear && mm < curMonth)) return 'Card has expired';
		return '';
	});

	$effect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	function close() {
		stage = 'list';
		form = {};
		onClose();
	}

	function add(id: string) {
		const label =
			id === 'card'
				? `Card •••• ${(form.cardNumber || '4242').slice(-4)}`
				: id === 'venmo'
					? `Venmo • ${form.venmo || '@username'}`
					: id === 'paypal'
						? `PayPal • ${form.email || 'user@example.com'}`
						: id === 'klarna'
							? 'Klarna'
							: id === 'ebt'
								? `EBT •••• ${(form.ebtNumber || '0000').slice(-4)}`
								: `Cash App • ${form.cashtag || '$username'}`;
		onSelect(label);
		close();
	}

	const isForm = $derived(stage !== 'list' && stage !== 'add');

	const title = $derived(stage === 'list' ? 'Payment method' : OPTIONS.find((o) => o.id === stage)?.label || 'Payment method');

	const formBtnLabel = $derived(
		stage === 'card'
			? 'Save card'
			: stage === 'venmo'
				? 'Connect Venmo'
				: stage === 'paypal'
					? 'Connect PayPal'
					: stage === 'klarna'
						? 'Set up Klarna'
						: stage === 'ebt'
							? 'Add EBT card'
							: stage === 'cashapp'
								? 'Connect Cash App'
								: 'Confirm'
	);

	function formatCardNumber(value: string) {
		const digits = value.replace(/\D/g, '').slice(0, 16);
		return digits.replace(/(.{4})(?=.)/g, '$1-').trim();
	}

	function formatExpiry(value: string) {
		const digits = value.replace(/\D/g, '').slice(0, 4);
		return digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
	}

	function onCardNumber(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		form = { ...form, cardNumber: formatCardNumber(input.value) };
	}

	function onExpiry(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		form = { ...form, expiry: formatExpiry(input.value) };
	}

	function onCvc(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		form = { ...form, cvc: input.value.replace(/\D/g, '').slice(0, 4) };
	}
</script>

{#snippet field(key: string, label: string, placeholder: string, type = 'text')}
	<label class="block">
		<span class="text-xs font-semibold text-black">{label}</span>
		<input
			type={type}
			bind:value={form[key]}
			placeholder={placeholder}
			class="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B7410E]/40"
		/>
	</label>
{/snippet}

{#if open}
	<div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
		<div class="absolute inset-0 bg-black/40 backdrop-blur-sm" onclick={close}></div>
		<div class="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out]">
			<div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
				<div class="flex items-center gap-2">
					{#if isForm}
						<button onclick={() => (stage = 'list')} class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-black transition">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
						</button>
					{/if}
					<h3 class="text-xl font-bold text-gray-900">{title}</h3>
				</div>
				<button onclick={close} class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-900 transition">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>

			<div class="max-h-[70vh] overflow-y-auto">
				<div class="px-6 py-4">
					{#if stage === 'list'}
						<div class="space-y-2">
							{#each OPTIONS as opt}
								<button onclick={() => (stage = opt.id)} class="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition">
									<span class="flex items-center gap-3">
										<span class="text-xl">{opt.icon}</span>
										<span class="text-left">
											<span class="block text-sm font-medium text-black">{opt.label}</span>
											<span class="block text-xs text-black">{opt.hint}</span>
										</span>
									</span>
									<svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
								</button>
							{/each}
						</div>
					{/if}

					{#if stage === 'card'}
						<div class="space-y-3">
							<label class="block">
								<span class="text-xs font-semibold text-black">Card number</span>
								<input
									type="text"
									inputmode="numeric"
									autocomplete="cc-number"
									maxlength="19"
									value={form.cardNumber || ''}
									oninput={onCardNumber}
									placeholder="1234-5678-9012-3456"
									class="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B7410E]/40"
								/>
							</label>
							<div class="grid grid-cols-2 gap-3">
								<label class="block">
									<span class="text-xs font-semibold text-black">Expiry</span>
									<input
										type="text"
										inputmode="numeric"
										autocomplete="cc-exp"
										maxlength="5"
										value={form.expiry || ''}
										oninput={onExpiry}
										placeholder="MM/YY"
										class={`mt-1 w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${expiryError ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-[#B7410E]/40'}`}
									/>
									{#if expiryError}<p class="text-xs text-red-500 mt-1">{expiryError}</p>{/if}
								</label>
								<label class="block">
									<span class="text-xs font-semibold text-black">CVC</span>
									<input
										type="text"
										inputmode="numeric"
										autocomplete="cc-csc"
										maxlength="3"
										value={form.cvc || ''}
										oninput={onCvc}
										placeholder="123"
										class="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#B7410E]/40"
									/>
								</label>
							</div>
						</div>
					{/if}

					{#if stage === 'venmo'}
						<div class="space-y-3">{@render field('venmo', 'Venmo username or phone', '@username or (555) 000-0000')}</div>
					{/if}

					{#if stage === 'paypal'}
						<div class="space-y-3">{@render field('email', 'PayPal email', 'you@example.com', 'email')}</div>
					{/if}

					{#if stage === 'klarna'}
						<div class="space-y-3">{@render field('phone', 'Mobile number', '(555) 000-0000', 'tel')}</div>
					{/if}

					{#if stage === 'ebt'}
						<div class="space-y-3">
							{@render field('ebtNumber', 'EBT card number', '0000 0000 0000')}
							{@render field('ebtPin', 'PIN', '••••', 'password')}
						</div>
					{/if}

					{#if stage === 'cashapp'}
						<div class="space-y-3">{@render field('cashtag', 'Cash App $Cashtag', '$username')}</div>
					{/if}
				</div>
			</div>

			{#if isForm}
				<div class="px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
					<button onclick={() => add(stage)} class="w-full h-12 rounded-xl bg-[#B7410E] hover:bg-[#9A360B] text-white font-semibold text-sm transition">{formBtnLabel}</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
