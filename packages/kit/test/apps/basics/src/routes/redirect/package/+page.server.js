import { authenticate } from 'test-redirect-importer';

export function load() {
	authenticate('/redirect/c');
}
