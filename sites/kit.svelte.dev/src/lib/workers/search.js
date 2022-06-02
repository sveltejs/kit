import { init } from '../search/init.js';

let indexes;
let lookup;

addEventListener('message', async (event) => {
	const { type, payload } = event.data;

	if (type === 'init') {
		const res = await fetch(`${payload.origin}/content.json`);
		const { blocks } = await res.json();
		({ indexes, lookup } = init(blocks));

		postMessage({ type: 'ready' });
	}

	if (type === 'query') {
		const results = indexes
			.map((index) => index.search(payload))
			.flat()
			.map((href) => lookup.get(href));

		postMessage({ type: 'results', payload: results });
	}

	if (type === 'recents') {
		const results = payload.map((href) => lookup.get(href)).filter(Boolean);

		postMessage({ type: 'recents', payload: results });
	}
});
