export const activeFilters = $state<string[]>([]);

export function toggleFilter(filter: string) {
	const index = activeFilters.indexOf(filter);
	if (index >= 0) {
		activeFilters.splice(index, 1);
	} else {
		activeFilters.push(filter);
	}
}
