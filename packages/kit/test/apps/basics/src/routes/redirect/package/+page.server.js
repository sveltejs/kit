import { authenticate } from 'redirect-pkg';

export function load() {
	authenticate('/redirect/c');
}
