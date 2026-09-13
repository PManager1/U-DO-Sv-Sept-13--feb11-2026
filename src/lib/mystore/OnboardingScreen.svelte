<script lang="ts">
	let { referralCode, onSaveReferral, onUploadMenu, onAddItem, onAddCategory, onDismiss, menuUploading }: {
		referralCode: string;
		onSaveReferral: (code: string) => Promise<void>;
		onUploadMenu: (file: File) => Promise<void>;
		onAddItem: () => void;
		onAddCategory: () => void;
		onDismiss: () => void;
		menuUploading: boolean;
	} = $props();

	let referralInput = $state(referralCode || '');
	let referralSaved = $state(!!referralCode);
	let menuUploaded = $state(false);
	let savingReferral = $state(false);

	const step1Done = referralSaved;
	const step2Done = menuUploaded;
	const completedCount = [step1Done, step2Done, false].filter(Boolean).length;
	const progressPct = Math.round((completedCount / 3) * 100);

	async function handleSaveReferral() {
		const code = referralInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
		if (!code) return;
		savingReferral = true;
		try {
			await onSaveReferral(code);
			referralSaved = true;
		} catch {}
		savingReferral = false;
	}

	async function handleMenuUpload(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		try {
			await onUploadMenu(file);
			menuUploaded = true;
		} catch {}
		(e.currentTarget as HTMLInputElement).value = '';
	}
</script>

<div class="max-w-2xl mx-auto">
	<div class="text-center mb-8">
		<div class="text-5xl mb-3">🎉</div>
		<h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Welcome to U-DO!</h1>
		<p class="text-gray-500 mt-2 text-sm sm:text-base">Let's get your store set up. Complete the steps below — you can always skip and come back later.</p>
	</div>

	<div class="mb-8 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
		<div class="flex items-center justify-between mb-2">
			<span class="text-sm font-semibold text-gray-700">Setup Progress</span>
			<span class="text-sm font-bold text-orange-500">{completedCount}/3 complete</span>
		</div>
		<div class="w-full bg-gray-100 rounded-full h-2.5">
			<div class="bg-orange-500 h-2.5 rounded-full transition-all duration-500" style="width:{progressPct}%"></div>
		</div>
	</div>

	<div class={`bg-white rounded-xl p-5 shadow-sm border mb-4 transition ${step1Done ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}>
		<div class="flex items-start gap-3">
			<div class={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition ${step1Done ? 'bg-green-500 text-white' : 'bg-orange-100 text-orange-600'}`}>{step1Done ? '✓' : '1'}</div>
			<div class="flex-1 min-w-0">
				<h3 class="font-bold text-gray-900">📌 Enter Your Referral Code</h3>
				<p class="text-xs text-gray-500 mt-0.5">Required — this is how drivers and customers find your store.</p>

				{#if step1Done}
					<div class="mt-3 flex items-center gap-2">
						<span class="bg-green-100 text-green-700 font-bold px-3 py-1.5 rounded-lg text-sm border border-green-200">{referralCode || referralInput}</span>
						<span class="text-xs text-green-600 font-medium">✅ Saved</span>
						<button onclick={() => { referralSaved = false; referralInput = referralCode || ''; }} class="text-xs text-orange-500 hover:text-orange-600 font-semibold transition ml-1" title="Edit referral code">✏️ Edit</button>
					</div>
				{:else}
					<div class="mt-3 flex items-center gap-2">
						<input type="text" value={referralInput} oninput={(e) => (referralInput = (e.currentTarget as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4))} onkeydown={(e) => e.key === 'Enter' && handleSaveReferral()} placeholder="e.g., ABCD" maxlength={4} class="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-center uppercase focus:outline-none focus:ring-2 focus:ring-orange-400" autofocus />
						<button onclick={handleSaveReferral} disabled={savingReferral || referralInput.length < 1} class="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-bold rounded-lg transition flex items-center gap-1.5">
							{#if savingReferral}<div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{/if}
							Save
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class={`bg-white rounded-xl p-5 shadow-sm border mb-4 transition ${step2Done ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}>
		<div class="flex items-start gap-3">
			<div class={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition ${step2Done ? 'bg-green-500 text-white' : 'bg-orange-100 text-orange-600'}`}>{step2Done ? '✓' : '2'}</div>
			<div class="flex-1 min-w-0">
				<h3 class="font-bold text-gray-900">📄 Upload Your Menu</h3>
				<p class="text-xs text-gray-500 mt-0.5">Don't want to add items one by one? Upload your menu (PDF or photo) and we'll create it for you.</p>

				{#if step2Done}
					<div class="mt-3"><span class="text-xs text-green-600 font-medium">✅ Menu uploaded — we'll set it up for you!</span></div>
				{:else}
					<div class="mt-3">
						<label class={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${menuUploading ? 'bg-gray-100 text-gray-400 cursor-wait' : 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200'}`}>
							<input type="file" accept=".pdf,image/*" class="hidden" oninput={handleMenuUpload} disabled={menuUploading} />
							{#if menuUploading}<div class="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>Uploading...{:else}<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Choose File{/if}
						</label>
						<p class="text-[10px] text-gray-400 mt-1.5">Accepts PDF, JPG, PNG</p>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
		<div class="flex items-start gap-3">
			<div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold bg-orange-100 text-orange-600">3</div>
			<div class="flex-1 min-w-0">
				<h3 class="font-bold text-gray-900">🍔 Add Menu Items</h3>
				<p class="text-xs text-gray-500 mt-0.5">Start building your menu by adding categories and items. You can also do this later from the main page.</p>
				<div class="mt-3 flex flex-wrap gap-2">
					<button onclick={onAddCategory} class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition">+ Add Category</button>
					<button onclick={onAddItem} class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg transition">+ Add Menu Item</button>
				</div>
			</div>
		</div>
	</div>

	<div class="flex items-center justify-between pt-4">
		<button onclick={onDismiss} class="text-sm text-gray-400 hover:text-gray-600 font-medium transition">Skip Setup →</button>
		{#if completedCount >= 1}
			<button onclick={onDismiss} class="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-lg transition shadow-sm">I'm Done! 🎉</button>
		{/if}
	</div>
</div>
