import { value } from './value.js';

export async function load() {
	// wait until the test has edited a server module mid-request
	await new Promise((fulfil) => (globalThis.resume_load = () => fulfil(undefined)));
	return { value };
}
