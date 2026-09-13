<script lang="ts">
	import { onMount } from 'svelte';
	import API_BASE from '$lib/api';

	let { tagOptions }: { tagOptions: string[] } = $props();

	const EMPTY_FORM = { parent: '', children: '' };

	let mappings = $state<any[]>([]);
	let loading = $state(true);
	let savingId = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let showAddModal = $state(false);
	let addForm = $state({ ...EMPTY_FORM });
	let editChildInput = $state<Record<number, string>>({});
	let toast = $state<{ type: string; text: string } | null>(null);
	let dragSource = $state<{ mappingIdx: number; childIdx: number } | null>(null);
	let dragTarget = $state<{ mappingIdx: number; childIdx: number } | null>(null);

	onMount(() => {
		fetchMappings();
	});

	$effect(() => {
		if (!toast) return;
		const t = setTimeout(() => (toast = null), 3000);
		return () => clearTimeout(t);
	});

	async function fetchMappings() {
		loading = true;
		try {
			const res = await fetch(API_BASE + 'admin/tag-parents');
			const data = await res.json();
			mappings = Array.isArray(data) ? data : [];
		} catch {
			mappings = [];
		} finally {
			loading = false;
		}
	}

	function reorderChild(mappingIdx: number, fromIdx: number, toIdx: number) {
		if (fromIdx === toIdx) return;
		const next = mappings.map((m) => ({ ...m }));
		const mapping = next[mappingIdx];
		const children = [...mapping.child_tags];
		const [moved] = children.splice(fromIdx, 1);
		children.splice(toIdx, 0, moved);
		children.forEach((c: any, i: number) => { c.priority = i + 1; });
		mapping.child_tags = children;
		next[mappingIdx] = mapping;
		mappings = next;
	}

	function removeChild(mappingIdx: number, childIdx: number) {
		const next = mappings.map((m) => ({ ...m }));
		const mapping = next[mappingIdx];
		let children = mapping.child_tags.filter((_: any, i: number) => i !== childIdx);
		children = children.map((c: any, i: number) => ({ ...c, priority: i + 1 }));
		mapping.child_tags = children;
		next[mappingIdx] = mapping;
		mappings = next;
	}

	function addChildTag(mappingIdx: number, tag: string) {
		if (!tag.trim()) return;
		const next = mappings.map((m) => ({ ...m }));
		const mapping = next[mappingIdx];
		const exists = mapping.child_tags.some((c: any) => c.tag === tag);
		if (!exists) {
			mapping.child_tags = [...mapping.child_tags, { tag, priority: mapping.child_tags.length + 1 }];
			next[mappingIdx] = mapping;
			mappings = next;
		}
		editChildInput = { ...editChildInput, [mappingIdx]: '' };
	}

	async function saveMapping(mappingIdx: number) {
		const mapping = mappings[mappingIdx];
		const mappingId = mapping.id || mapping._id;
		savingId = mappingId;
		try {
			const res = await fetch(API_BASE + 'admin/tag-parents/' + mappingId, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ child_tags: mapping.child_tags })
			});
			if (res.ok) toast = { type: 'success', text: 'Saved successfully' };
			else {
				const data = await res.json();
				toast = { type: 'error', text: data.message || 'Save failed' };
			}
		} catch (err) {
			toast = { type: 'error', text: 'Network error: ' + (err as Error).message };
		} finally {
			savingId = null;
		}
	}

	async function deleteMapping(mappingIdx: number) {
		const mapping = mappings[mappingIdx];
		const mappingId = mapping.id || mapping._id;
		if (!window.confirm(`Delete parent tag "${mapping.parent}"?`)) return;
		deletingId = mappingId;
		try {
			const res = await fetch(API_BASE + 'admin/tag-parents/' + mappingId, { method: 'DELETE' });
			if (res.ok) {
				mappings = mappings.filter((_, i) => i !== mappingIdx);
				toast = { type: 'success', text: 'Deleted' };
			} else {
				toast = { type: 'error', text: 'Delete failed' };
			}
		} catch {
			toast = { type: 'error', text: 'Network error' };
		} finally {
			deletingId = null;
		}
	}

	async function handleAddParent() {
		if (!addForm.parent.trim()) return;
		const children = addForm.children
			.split(',')
			.map((s) => s.trim().toLowerCase().replace(/\s+/g, '_'))
			.filter(Boolean);
		const childTags = [{ tag: addForm.parent.trim().toLowerCase().replace(/\s+/g, '_'), priority: 1 }];
		children.forEach((c, i) => {
			if (c !== childTags[0].tag) childTags.push({ tag: c, priority: childTags.length + 1 });
		});
		try {
			const res = await fetch(API_BASE + 'admin/tag-parents', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					parent: addForm.parent.trim().toLowerCase().replace(/\s+/g, '_'),
					child_tags: childTags
				})
			});
			if (res.ok) {
				const created = await res.json();
				mappings = [...mappings, created];
				showAddModal = false;
				addForm = { ...EMPTY_FORM };
				toast = { type: 'success', text: 'Tag parent created' };
			} else {
				const data = await res.json();
				toast = { type: 'error', text: data.message || 'Create failed' };
			}
		} catch {
			toast = { type: 'error', text: 'Network error' };
		}
	}
</script>

{#if loading}
	<div class="flex items-center justify-center py-16"><div class="text-gray-400 text-sm">Loading tag mappings...</div></div>
{:else}
	<div class="space-y-4">
		{#if toast}
			<div class={`p-3 rounded-lg text-sm ${toast.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
				<div class="flex items-center justify-between">
					<span>{toast.text}</span>
					<button onclick={() => (toast = null)} class="text-current opacity-50 hover:opacity-100 ml-2">✕</button>
				</div>
			</div>
		{/if}

		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-xl font-bold text-gray-900">🏷️ Tagging</h2>
				<p class="text-sm text-gray-500">{mappings.length} parent-child tag mappings</p>
			</div>
			<button onclick={() => (showAddModal = true)} class="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 text-sm font-medium">+ Add Parent</button>
		</div>

		{#if mappings.length === 0}
			<div class="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">No tag mappings yet. Click "Add Parent" to create one.</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{#each mappings as mapping, mappingIdx}
					{@const mid = mapping.id || mapping._id}
					{@const children = mapping.child_tags || []}
					<div class="bg-white rounded-xl border border-gray-200 p-5">
						<div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
							<div class="flex items-center gap-2">
								<span class="text-lg">🏷️</span>
								<span class="font-bold text-gray-900 text-lg">{mapping.parent}</span>
								<span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{children.length} children</span>
							</div>
							<button onclick={() => deleteMapping(mappingIdx)} disabled={deletingId === mid} class="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 font-medium">
								{deletingId === mid ? 'Deleting...' : 'Delete'}
							</button>
						</div>

						<div class="space-y-2 mb-4">
							{#each children as child, childIdx}
								{@const isOver = dragTarget && dragTarget.mappingIdx === mappingIdx && dragTarget.childIdx === childIdx}
								<div
									draggable
									ondragstart={() => (dragSource = { mappingIdx, childIdx })}
									ondragover={(e) => { e.preventDefault(); dragTarget = { mappingIdx, childIdx }; }}
									ondragleave={() => (dragTarget = null)}
									ondrop={() => {
										if (!dragSource || dragSource.mappingIdx !== mappingIdx) return;
										reorderChild(mappingIdx, dragSource.childIdx, childIdx);
										dragSource = null;
										dragTarget = null;
									}}
									ondragend={() => { dragSource = null; dragTarget = null; }}
									class={`flex items-center gap-3 px-3 py-2 rounded-lg group cursor-grab active:cursor-grabbing transition-colors ${isOver ? 'bg-cyan-50 ring-2 ring-cyan-300' : 'bg-gray-50'}`}
								>
									<span class="text-gray-400 cursor-grab active:cursor-grabbing select-none flex-shrink-0 text-sm">⠿</span>
									<span class="w-6 h-6 flex items-center justify-center rounded-full bg-cyan-100 text-cyan-700 text-xs font-bold flex-shrink-0">{child.priority}</span>
									<span class="text-sm text-gray-800 flex-1">{child.tag}</span>
									<button onclick={() => removeChild(mappingIdx, childIdx)} class="w-6 h-6 flex items-center justify-center rounded bg-white border border-gray-200 text-red-400 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity" title="Remove">✕</button>
								</div>
							{/each}
						</div>

						<div class="flex items-center gap-3">
							<div class="flex-1 relative">
								<input
									type="text"
									value={editChildInput[mappingIdx] || ''}
									oninput={(e) => (editChildInput = { ...editChildInput, [mappingIdx]: (e.currentTarget as HTMLInputElement).value })}
									onkeydown={(e) => { if (e.key === 'Enter') addChildTag(mappingIdx, editChildInput[mappingIdx] || ''); }}
									placeholder="Add child tag..."
									list={`child-tag-suggestions-${mid}`}
									class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
								/>
								<datalist id={`child-tag-suggestions-${mid}`}>
									{#each tagOptions.filter((t) => !(mapping.child_tags || []).some((c: any) => c.tag === t)) as t}
										<option value={t} />
									{/each}
								</datalist>
							</div>
							<button onclick={() => addChildTag(mappingIdx, editChildInput[mappingIdx] || '')} disabled={!editChildInput[mappingIdx]?.trim()} class="px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">+ Add</button>
							<button onclick={() => saveMapping(mappingIdx)} disabled={savingId === mid} class={`px-4 py-2 rounded-lg text-sm font-medium text-white ${savingId === mid ? 'bg-gray-400 cursor-wait' : 'bg-cyan-600 hover:bg-cyan-700'}`}>
								{savingId === mid ? 'Saving...' : 'Save'}
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if showAddModal}
			<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick={() => (showAddModal = false)}>
				<div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4" onclick={(e) => e.stopPropagation()}>
					<div class="flex items-center justify-between mb-5">
						<h2 class="text-lg font-bold text-gray-900">Add Parent Tag Mapping</h2>
						<button onclick={() => (showAddModal = false)} class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
					</div>

					<div class="space-y-4">
						<div>
							<label class="text-xs font-semibold text-gray-600 mb-1 block">Parent Tag</label>
							<input type="text" value={addForm.parent} oninput={(e) => (addForm = { ...addForm, parent: (e.currentTarget as HTMLInputElement).value })} placeholder="e.g. dessert" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
						</div>
						<div>
							<label class="text-xs font-semibold text-gray-600 mb-1 block">Children (comma-separated, order = priority)</label>
							<textarea value={addForm.children} oninput={(e) => (addForm = { ...addForm, children: (e.currentTarget as HTMLTextAreaElement).value })} placeholder="dessert, ice_cream, cake, cookies" rows={3} class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"></textarea>
							<p class="text-xs text-gray-400 mt-1">First child = priority 2 (parent is priority 1)</p>
						</div>
					</div>

					<div class="flex gap-3 mt-6">
						<button onclick={() => (showAddModal = false)} class="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
						<button onclick={handleAddParent} disabled={!addForm.parent.trim()} class="flex-1 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 transition">Create</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
