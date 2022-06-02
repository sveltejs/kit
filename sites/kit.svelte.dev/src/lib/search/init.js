import flexsearch from 'flexsearch';

export function init(blocks) {
	// we have multiple indexes, so we can rank sections (migration guide comes last)
	const max_rank = Math.max(...blocks.map((block) => block.rank ?? 0));

	const indexes = Array.from(
		{ length: max_rank + 1 },
		() => new flexsearch.Index({ tokenize: 'forward' })
	);

	/** @type {Map<string, import('./types').Block>} */
	const lookup = new Map();

	for (const block of blocks) {
		const title = block.breadcrumbs.pop();
		lookup.set(block.href, {
			title,
			href: block.href,
			breadcrumbs: block.breadcrumbs,
			content: block.content
		});
		indexes[block.rank ?? 0].add(block.href, `${title} ${block.content}`);
	}

	return { indexes, lookup };
}
