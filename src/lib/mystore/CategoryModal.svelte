<script lang="ts">
	import { onMount } from 'svelte';
	import * as api from './api';

	const iconOptions = ['🍽️', '🍕', '🍔', '🌮', '🍣', '🥗', '🍝', '🥩', '🍰', '☕', '🥤', '🍜', '🥪', '🍗', '🧁', '🍦'];

	let { categoryId, onClose, modifierGroups, showToast, loadAllData }: {
		categoryId: string | null;
		onClose: () => void;
		modifierGroups: any[];
		showToast: (msg: string, type?: string) => void;
		loadAllData: () => Promise<void>;
	} = $props();

	let form = $state({ name: '', description: '', icon: '🍽️', color: '#f97316' });
	let selectedModifiers = $state<string[]>([]);
	let foodCategories = $state<any[]>([]);
	let saving = $state(false);
	let loadingCat = $state(!!categoryId);

	onMount(() => {
		api.getFoodCategories().then((data: any) => (foodCategories = data)).catch(() => {});
		if (categoryId) {
			api.getCategories().then((cats) => {
				const cat = cats.find((c: any) => c.id === categoryId);
				if (cat) {
					form = {
						name: cat.name || cat.title || '',
						description: cat.description || '',
						icon: cat.icon || '🍽️',
						color: cat.color || '#f97316'
					};
					selectedModifiers = cat.inheritedModifierGroupIds || cat.localModifierGroupIds || cat.modifier_group_ids || cat.modifierGroupIds || [];
				}
				loadingCat = false;
			}).catch(() => (loadingCat = false));
		}
	});

	function selectFoodCategory(name: string, icon: string) {
		form = { ...form, name, icon: icon || '🍽️' };
	}

	async function handleSave() {
		if (!form.name.trim()) { showToast('Category name is required', 'error'); return; }
		saving = true;
		try {
			const catData = { name: form.name, description: form.description, icon: form.icon, color: form.color, modifier_group_ids: selectedModifiers };
			if (categoryId) {
				await api.updateCategory(categoryId, catData);
				showToast('Category updated!');
			} else {
				await api.createCategory(catData);
				showToast('Category created!');
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
		if (!window.confirm('Delete this category? Items in it will become uncategorized.')) return;
		try {
			await api.deleteCategory(categoryId as string);
			showToast('Category deleted!');
			onClose();
			await loadAllData();
		} catch (err: any) {
			showToast(`Delete failed: ${err.message}`, 'error');
		}
	}
</script>

<div class="fixed inset-0 bg-black/50 z-[100]" onclick={onClose}></div>
<div class="fixed inset-0 z-[101] flex items-center justify-center p-4">
	<div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
		<div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
			<h2 class="text-xl font-bold text-gray-900">{categoryId ? 'Edit Category' : 'Add Category'}</h2>
			<div class="flex items-center gap-1">
				{#if categoryId}
					<button onclick={handleDelete} class="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition" title="Delete category">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
					</button>
				{/if}
				<button onclick={onClose} class="p-2 hover:bg-gray-100 rounded-full transition">
					<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>
		</div>

		{#if loadingCat}
			<div class="flex items-center justify-center py-20">
				<div class="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
			</div>
		{:else}
			<div class="p-6 space-y-5">
				{#if !categoryId && foodCategories.length > 0}
					<div>
						<label class="block text-sm font-semibold text-gray-700 mb-2">Quick Pick</label>
						<div class="grid grid-cols-4 gap-2">
							{#each foodCategories as cat}
								<button type="button" onclick={() => selectFoodCategory(cat.name, cat.icon)} class="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition cursor-pointer text-center">
									<span class="text-xl">{cat.icon || '🍽️'}</span>
									<span class="text-[11px] font-medium text-gray-700 leading-tight">{cat.name}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<div>
					<label class="block text-sm font-semibold text-gray-700 mb-1">Category Name *</label>
					<input type="text" value={form.name} oninput={(e) => (form = { ...form, name: (e.currentTarget as HTMLInputElement).value })} class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="e.g., Burgers" />
				</div>

				<div>
					<label class="block text-sm font-semibold text-gray-700 mb-2">Icon</label>
					<div class="flex flex-wrap gap-2">
						{#each iconOptions as icon}
							<button type="button" onclick={() => (form = { ...form, icon })} class={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl transition ${form.icon === icon ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>{icon}</button>
						{/each}
					</div>
				</div>

				<div>
					<label class="block text-sm font-semibold text-gray-700 mb-1">Color</label>
					<div class="flex items-center gap-3">
						<input type="color" value={form.color} oninput={(e) => (form = { ...form, color: (e.currentTarget as HTMLInputElement).value })} class="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer" />
						<input type="text" value={form.color} oninput={(e) => (form = { ...form, color: (e.currentTarget as HTMLInputElement).value })} class="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
					</div>
				</div>

				<div>
					<label class="block text-sm font-semibold text-gray-700 mb-1">Description</label>
					<textarea value={form.description} oninput={(e) => (form = { ...form, description: (e.currentTarget as HTMLTextAreaElement).value })} rows={2} class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" placeholder="Optional category description..."></textarea>
				</div>

				{#if modifierGroups.length > 0}
					<div>
						<label class="block text-sm font-semibold text-gray-700 mb-2">Modifier Groups</label>
						<div class="space-y-2 max-h-40 overflow-y-auto">
							{#each modifierGroups as group}
								<label class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition">
									<input type="checkbox" checked={selectedModifiers.includes(group.id)} onchange={(e) => { if ((e.currentTarget as HTMLInputElement).checked) selectedModifiers = [...selectedModifiers, group.id]; else selectedModifiers = selectedModifiers.filter((id) => id !== group.id); }} class="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500" />
									<span class="text-sm font-medium text-gray-900">{group.name}</span>
									<span class="text-xs text-gray-400 ml-auto">{group.options?.length || 0} opts</span>
								</label>
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex gap-3 pt-2">
					<button onclick={onClose} class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition">Cancel</button>
					<button onclick={handleSave} disabled={saving} class="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 px-6 rounded-lg transition shadow-sm hover:shadow-md flex items-center justify-center gap-2">
						{#if saving}<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Saving...{:else}{categoryId ? 'Update Category' : 'Create Category'}{/if}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
