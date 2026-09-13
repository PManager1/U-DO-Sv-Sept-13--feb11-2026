<script lang="ts">
	import { onMount } from 'svelte';
	import * as api from './api';

	let { groupId, onClose, showToast, loadAllData }: {
		groupId: string | null;
		onClose: () => void;
		showToast: (msg: string, type?: string) => void;
		loadAllData: () => Promise<void>;
	} = $props();

	let form = $state({ name: '', minSelection: 0, maxSelection: 1, isRequired: false });
	let options = $state<any[]>([]);
	let saving = $state(false);
	let loadingGroup = $state(!!groupId);
	let advanced = $state(false);
	let uploadingIdx = $state<number | null>(null);
	let templates = $state<any[]>([]);

	function generateOptId() {
		return 'opt_' + crypto.randomUUID().replace(/-/g, '').substring(0, 12);
	}

	onMount(() => {
		if (!groupId) {
			api.getModifierTemplates().then((data) => { templates = Array.isArray(data) ? data : []; }).catch(() => (templates = []));
		}
		if (groupId) {
			api.getModifierGroups().then((groups) => {
				const group = groups.find((g: any) => g.id === groupId);
				if (group) {
					form = { name: group.name || '', minSelection: group.minSelection || 0, maxSelection: group.maxSelection || 1, isRequired: group.isRequired || false };
					options = group.options || [];
					advanced = (group.minSelection !== 0 && group.minSelection !== 1) || (group.maxSelection !== 1 && group.maxSelection !== 5);
				}
				loadingGroup = false;
			}).catch(() => (loadingGroup = false));
		} else {
			options = [{ id: generateOptId(), name: '', extraPrice: '', isAvailable: true, isDefault: false }];
		}
	});

	function applyTemplate(template: any) {
		form = { name: template.name, minSelection: template.min_selection, maxSelection: template.max_selection, isRequired: template.is_required };
		options = (template.options || []).map((o: any) => ({ id: generateOptId(), name: o.name, extraPrice: o.extra_price || 0, isAvailable: true, isDefault: false, imageUrl: '' }));
	}

	const isSingle = $derived(form.minSelection === 1 && form.maxSelection === 1);

	function setSelectionType(type: string) {
		if (type === 'single') form = { ...form, minSelection: 1, maxSelection: 1 };
		else form = { ...form, minSelection: 0, maxSelection: 5 };
	}

	function addOption() {
		options = [...options, { id: generateOptId(), name: '', extraPrice: '', isAvailable: true, isDefault: false, imageUrl: '' }];
	}

	function updateOption(index: number, field: string, value: any) {
		const arr = [...options];
		arr[index] = { ...arr[index], [field]: value };
		options = arr;
	}

	function removeOption(index: number) {
		options = options.filter((_, i) => i !== index);
	}

	async function handleOptionImageUpload(idx: number, file: File) {
		uploadingIdx = idx;
		try {
			const url = await api.uploadImageToGCS(file);
			updateOption(idx, 'imageUrl', url);
			showToast('Image uploaded!');
		} catch {
			showToast('Image upload failed', 'error');
		} finally {
			uploadingIdx = null;
		}
	}

	async function handleSave() {
		if (!form.name.trim()) { showToast('Group name is required', 'error'); return; }
		const validOptions = options.filter((o) => o.name.trim());
		if (validOptions.length === 0) { showToast('Add at least one option', 'error'); return; }
		for (let i = 0; i < validOptions.length; i++) {
			const opt = validOptions[i];
			const price = opt.extraPrice;
			if (price === '' || price === null || price === undefined) { showToast(`Price is required for "${opt.name || `Option ${i + 1}`}"`, 'error'); return; }
			const numPrice = parseFloat(price);
			if (isNaN(numPrice)) { showToast(`Invalid price for "${opt.name || `Option ${i + 1}`}"`, 'error'); return; }
			if (numPrice < 0) { showToast(`Price cannot be negative for "${opt.name || `Option ${i + 1}`}"`, 'error'); return; }
		}
		saving = true;
		try {
			const groupData = { name: form.name, description: '', minSelection: parseInt(String(form.minSelection)) || 0, maxSelection: parseInt(String(form.maxSelection)) || 1, isRequired: form.isRequired, options: validOptions.map((o) => ({ ...o, extraPrice: parseFloat(o.extraPrice) })) };
			if (groupId) {
				await api.updateModifierGroup(groupId, groupData);
				showToast('Modifier group updated!');
			} else {
				await api.createModifierGroup(groupData);
				showToast('Modifier group created!');
			}
			onClose();
			await loadAllData();
		} catch (err: any) {
			showToast(`Error: ${err.message}`, 'error');
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!window.confirm('Delete this modifier group? It will be removed from all items.')) return;
		try {
			await api.deleteModifierGroup(groupId as string);
			showToast('Modifier group deleted!');
			onClose();
			await loadAllData();
		} catch (err: any) {
			showToast(`Delete failed: ${err.message}`, 'error');
		}
	}
</script>

<div class="fixed inset-0 bg-black/50 z-[200]" onclick={onClose}></div>
<div class="fixed inset-0 z-[201] flex items-center justify-center p-4">
	<div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
		<div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
			<h2 class="text-xl font-bold text-gray-900">{groupId ? 'Edit Modifier Group' : 'Add Modifier Group'}</h2>
			<div class="flex items-center gap-1">
				{#if groupId}
					<button onclick={handleDelete} class="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition" title="Delete modifier group">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
					</button>
				{/if}
				<button onclick={onClose} class="p-2 hover:bg-gray-100 rounded-full transition">
					<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>
		</div>

		{#if loadingGroup}
			<div class="flex items-center justify-center py-20">
				<div class="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
			</div>
		{:else}
			<div class="p-6 space-y-5">
				{#if !groupId}
					<div>
						<label class="block text-sm font-semibold text-gray-700 mb-2">Quick Start Templates</label>
						<p class="text-xs text-gray-500 mb-3">Tap to auto-fill a common modifier group. You can customize after.</p>
						<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
							{#each templates as template}
								<button type="button" onclick={() => applyTemplate(template)} class={`px-3 py-2.5 rounded-lg border-2 text-sm font-semibold text-center transition hover:shadow-md ${form.name === template.name ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50'}`}>
									<span class="block text-lg mb-0.5">{String(template.label || '').split(' ')[0]}</span>
									<span class="block text-xs leading-tight">{String(template.label || '').split(' ').slice(1).join(' ')}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<div>
					<label class="block text-sm font-semibold text-gray-700 mb-1">Group Name *</label>
					<input type="text" value={form.name} oninput={(e) => (form = { ...form, name: (e.currentTarget as HTMLInputElement).value })} class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g., Size, Side, Drink" />
				</div>

				<div>
					<label class="block text-sm font-semibold text-gray-700 mb-2">Selection Type</label>
					<div class="flex gap-3">
						<button type="button" onclick={() => setSelectionType('single')} class={`flex-1 py-2.5 px-4 rounded-lg border-2 font-semibold text-sm text-center transition ${isSingle ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'}`}>Single Choice</button>
						<button type="button" onclick={() => setSelectionType('multiple')} class={`flex-1 py-2.5 px-4 rounded-lg border-2 font-semibold text-sm text-center transition ${!isSingle ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-600 hover:border-orange-300'}`}>Multiple Choice</button>
					</div>
					<p class="text-xs text-gray-500 mt-2">{isSingle ? 'Customer picks one option. Shows as radio buttons.' : 'Customer can pick multiple options. Shows as checkboxes.'}</p>
				</div>

				<div class="flex items-center gap-3">
					<label class="relative inline-flex items-center cursor-pointer">
						<input type="checkbox" checked={form.isRequired} onchange={(e) => (form = { ...form, isRequired: (e.currentTarget as HTMLInputElement).checked })} class="sr-only peer" />
						<div class="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
					</label>
					<span class="text-sm font-semibold text-gray-700">Required {#if form.isRequired}<span class="text-orange-500">(customer must choose)</span>{:else}<span class="text-gray-400">(optional)</span>{/if}</span>
				</div>

				<div>
					<button type="button" onclick={() => (advanced = !advanced)} class="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
						<svg class={`w-4 h-4 transition-transform ${advanced ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
						Advanced settings
					</button>
					{#if advanced}
						<div class="mt-3 grid grid-cols-3 gap-3">
							<div>
								<label class="block text-xs font-semibold text-gray-600 mb-1">Min</label>
								<input type="number" min="0" value={form.minSelection} oninput={(e) => { const v = (e.currentTarget as HTMLInputElement).value; form = { ...form, minSelection: v === '' ? 0 : (parseInt(v) || 0) }; }} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
							</div>
							<div>
								<label class="block text-xs font-semibold text-gray-600 mb-1">Max</label>
								<input type="number" min="1" value={form.maxSelection} oninput={(e) => { const v = (e.currentTarget as HTMLInputElement).value; form = { ...form, maxSelection: v === '' ? 1 : (parseInt(v) || 1) }; }} class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
							</div>
							<div class="flex items-end">
								<label class="flex items-center gap-2 cursor-pointer pb-2">
									<input type="checkbox" checked={form.isRequired} onchange={(e) => (form = { ...form, isRequired: (e.currentTarget as HTMLInputElement).checked })} class="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500" />
									<span class="text-xs font-semibold text-gray-600">Required</span>
								</label>
							</div>
						</div>
					{/if}
				</div>

				<div>
					<div class="flex items-center justify-between mb-2">
						<label class="text-sm font-semibold text-gray-700">Options</label>
						<button type="button" onclick={addOption} class="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
							Add Option
						</button>
					</div>
					<div class="space-y-2">
						{#each options as opt, idx}
							<div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
								<label class="relative flex-shrink-0 cursor-pointer group">
									<input type="file" accept="image/*" class="hidden" oninput={(e) => { const file = (e.currentTarget as HTMLInputElement).files?.[0]; if (file) handleOptionImageUpload(idx, file); (e.currentTarget as HTMLInputElement).value = ''; }} />
									{#if uploadingIdx === idx}
										<div class="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center"><div class="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>
									{:else if opt.imageUrl}
										<div class="relative">
											<img src={opt.imageUrl} alt="" class="w-10 h-10 rounded-lg object-cover border border-gray-200" />
											<button type="button" onclick={(e) => { e.preventDefault(); updateOption(idx, 'imageUrl', ''); }} class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center">✕</button>
										</div>
									{:else}
										<div class="w-10 h-10 rounded-lg bg-white border-2 border-dashed border-gray-300 flex items-center justify-center group-hover:border-orange-400 transition">
											<svg class="w-4 h-4 text-gray-400 group-hover:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
										</div>
									{/if}
								</label>
								<input type="text" value={opt.name} oninput={(e) => updateOption(idx, 'name', (e.currentTarget as HTMLInputElement).value)} class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Option name" />
								<div class="relative w-24 flex-shrink-0">
									<span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
									<input type="number" step="0.01" value={opt.extraPrice || ''} oninput={(e) => updateOption(idx, 'extraPrice', (e.currentTarget as HTMLInputElement).value)} class="w-full pl-6 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="0.00" />
								</div>
								<button type="button" onclick={() => removeOption(idx)} class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition flex-shrink-0">
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
								</button>
							</div>
						{/each}
						<button type="button" onclick={addOption} class="w-full py-2.5 text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center justify-center gap-1.5 border-2 border-dashed border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50/50 transition">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
							Add Option
						</button>
					</div>
				</div>

				<div class="flex gap-3 pt-2">
					<button onclick={onClose} class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition">Cancel</button>
					<button onclick={handleSave} disabled={saving} class="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 px-6 rounded-lg transition shadow-sm hover:shadow-md flex items-center justify-center gap-2">
						{#if saving}<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Saving...{:else}{groupId ? 'Update Group' : 'Create Group'}{/if}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
