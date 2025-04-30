import { sync_dedupe } from '../dedupe.js';

/**
 * Internal function to test that types are deduped correctly
 * @param {*} a
 * @param {*} ne_to_a
 * @returns
 */
export default function test_type(a, ne_to_a) {
	return () => {
		const totally_different_type = typeof a === 'string' ? 1 : 'foo';
		const [count, eq_to_a] = sync_dedupe(a);
		if (eq_to_a !== a) {
			return new Response('Invalid dedupe', { status: 500 });
		}

		const [new_count, eq_to_a_too] = sync_dedupe(a);
		if (new_count !== count) {
			return new Response('Value was not deduped', { status: 500 });
		}
		if (eq_to_a_too !== a) {
			return new Response('Invalid dedupe', { status: 500 });
		}

		const [ne_count, eq_to_ne_to_a] = sync_dedupe(ne_to_a);
		if (ne_count === count) {
			return new Response('Value used previous dedupe', { status: 500 });
		}
		if (eq_to_ne_to_a !== ne_to_a) {
			return new Response('Invalid dedupe', { status: 500 });
		}

		const [new_ne_count, eq_to_ne_to_a_too] = sync_dedupe(totally_different_type);
		if (new_ne_count === ne_count || new_ne_count === count) {
			return new Response('Value was not deduped', { status: 500 });
		}
		if (eq_to_ne_to_a_too !== totally_different_type) {
			return new Response('Invalid dedupe', { status: 500 });
		}

		return new Response(null, { status: 204 });
	};
}
