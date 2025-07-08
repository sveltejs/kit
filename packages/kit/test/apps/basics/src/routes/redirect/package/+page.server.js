import { isRedirect } from '@sveltejs/kit';
import { authenticate } from 'test-redirect-importer';

export function load() {
	try {
		authenticate('/redirect/c');
	} catch (e) {
		console.error(isRedirect(e));
		console.error(import.meta.url);
		console.error(e);
		throw e;
	}
}
