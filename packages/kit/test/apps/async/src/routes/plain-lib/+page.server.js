// @ts-ignore
import { create_key_set } from 'e2e-test-dep-plain';

export function load() {
	return { key_set: create_key_set('https://example.com/jwks') };
}
