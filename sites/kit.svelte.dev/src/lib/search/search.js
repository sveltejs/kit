import flexsearch from 'flexsearch';

let inited = false;

/** @type {import('flexsearch').Index[]} */
let indexes;

/** @type {Map<string, import('./types').Block>} */
const map = new Map();

export function init(blocks) {
	if (inited) return;

	// we have multiple indexes, so we can rank sections (migration guide comes last)
	const max_rank = Math.max(...blocks.map((block) => block.rank ?? 0));

	indexes = Array.from(
		{ length: max_rank + 1 },
		() => new flexsearch.Index({ tokenize: 'forward' })
	);

	for (const block of blocks) {
		const title = block.breadcrumbs.pop();
		map.set(block.href, {
			title,
			href: block.href,
			breadcrumbs: block.breadcrumbs,
			content: block.content
		});
		indexes[block.rank ?? 0].add(block.href, `${title} ${block.content}`);
	}

	inited = true;
}

/**
 * @param {string} query
 * @returns {import('./types').Block[]}
 */
export function search(query) {
	const blocks = indexes
		.map((index) => index.search(query))
		.flat()
		.map(lookup);

	return blocks;
}

/** @param {string} href */
export function lookup(href) {
	return map.get(href);
}
