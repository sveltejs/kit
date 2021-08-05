const minerals = new Set(['aluminium', 'borax', 'chromium', 'diamond', 'edenite']);

/** @type {import("@sveltejs/kit").RequestHandler} */
export function get({ params }) {
	if (minerals.has(params.mineral)) {
		return {
			body: { type: 'mineral' }
		};
	}
}
