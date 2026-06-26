import { error } from '@sveltejs/kit';

export async function load() {
	error(500, 'Internal server error from tracing test');
}
