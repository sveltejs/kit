import { browser } from '$app/env';
import { b } from '../gate.js';

export async function load() {
	if (browser) await b.released;
}
