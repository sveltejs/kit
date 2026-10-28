/** Subsets that must be downloaded but never auto-preloaded (Next ignoredSubsets analog). */
const CJK_SUBSETS = new Set([
	'japanese',
	'korean',
	'chinese-simplified',
	'chinese-traditional',
	'chinese-hongkong',
	'chinese-japanese-korean'
]);

/**
 * @template {{ href: string }} T
 * @param {T[]} entries
 * @returns {T[]}
 */
export function unique_by_href(entries) {
	/** @type {Set<string>} */
	const seen = new Set();
	/** @type {T[]} */
	const unique = [];
	for (const entry of entries) {
		if (seen.has(entry.href)) continue;
		seen.add(entry.href);
		unique.push(entry);
	}
	return unique;
}

/**
 * @param {Array<{ href: string; type: string; subset?: string }>} preloads
 * @param {boolean} preload
 * @returns {Array<{ href: string; type: string; subset?: string }>}
 */
export function filter_preloads(preloads, preload) {
	if (!preload) return [];
	return unique_by_href(
		preloads.filter((entry) => !entry.subset || !CJK_SUBSETS.has(entry.subset))
	);
}

/**
 * @param {string | undefined} subset
 * @returns {boolean}
 */
export function is_cjk_subset(subset) {
	return !!subset && CJK_SUBSETS.has(subset);
}
