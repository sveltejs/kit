const groups = ['alpha', 'beta', 'gamma', 'delta'];

export function load({ locals }) {
	const items = Array.from({ length: 200 }, (_, index) => ({
		id: index,
		slug: `benchmark-item-${index}`,
		group: groups[index % groups.length],
		stats: {
			rank: index + 1,
			score: (index * 13) % 97,
			featured: index % 9 === 0
		},
		tags: ['benchmark', `group-${index % groups.length}`]
	}));

	return {
		request: locals.benchmark ?? {
			cohort: 'seed',
			cookie: 'seed',
			path: '/ssr'
		},
		summary: {
			total: items.length,
			first: items[0].slug,
			last: items[items.length - 1].slug
		},
		items
	};
}
