import flexsearch from 'flexsearch';

export let inited = false;

/** @type {import('flexsearch').Index[]} */
let indexes;

/** @type {Map<string, import('./types').Block>} */
const map = new Map();

/** @type {Map<string, string>} */
const hrefs = new Map();

export function init(blocks) {
	if (inited) return;

	// we have multiple indexes, so we can rank sections (migration guide comes last)
	const max_rank = Math.max(...blocks.map((block) => block.rank ?? 0));

	indexes = Array.from(
		{ length: max_rank + 1 },
		() => new flexsearch.Index({ tokenize: 'forward' })
	);

	for (const block of blocks) {
		const title = block.breadcrumbs[block.breadcrumbs.length - 1];
		map.set(block.href, {
			title,
			href: block.href,
			breadcrumbs: block.breadcrumbs,
			content: block.content
		});
		indexes[block.rank ?? 0].add(block.href, `${title} ${block.content}`);

		hrefs.set(block.breadcrumbs.join('::'), block.href);
	}

	inited = true;
}

/**
 * @param {string} query
 * @returns {import('./types').Block[]}
 */
export function search(query) {
	const escaped = query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
	const regex = new RegExp(`(^|\\b)${escaped}`, 'i');

	const blocks = indexes
		.map((index) => index.search(query))
		.flat()
		.map(lookup)
		.map((block, rank) => ({ block, rank }))
		.sort((a, b) => {
			const a_title_matches = regex.test(a.block.title);
			const b_title_matches = regex.test(b.block.title);

			// massage the order a bit, so that title matches
			// are given higher priority
			if (a_title_matches !== b_title_matches) {
				return a_title_matches ? -1 : 1;
			}

			return a.block.breadcrumbs.length - b.block.breadcrumbs.length || a.rank - b.rank;
		})
		.map(({ block }) => block);

	const results = tree([], blocks).children;

	return results;
}

/** @param {string} href */
export function lookup(href) {
	return map.get(href);
}

function tree(breadcrumbs, blocks) {
	const depth = breadcrumbs.length;

	const node = blocks.find((block) => {
		if (block.breadcrumbs.length !== depth) return false;
		return breadcrumbs.every((part, i) => block.breadcrumbs[i] === part);
	});

	const descendants = blocks.filter((block) => {
		if (block.breadcrumbs.length <= depth) return false;
		return breadcrumbs.every((part, i) => block.breadcrumbs[i] === part);
	});

	const child_parts = Array.from(new Set(descendants.map((block) => block.breadcrumbs[depth])));

	return {
		breadcrumbs,
		href: hrefs.get(breadcrumbs.join('::')),
		node,
		children: child_parts.map((part) => tree([...breadcrumbs, part], descendants))
	};
}
