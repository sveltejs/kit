import { state } from '../state.js';

export function load() {
	// reset so the test can run repeatedly against the same server
	state.selected = false;
}
