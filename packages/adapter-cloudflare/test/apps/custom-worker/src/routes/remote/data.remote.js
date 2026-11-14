import { command, query } from '$app/server';
import { Marker, state } from '../../lib/state.js';

// the worker creates the marker before sveltekit handles any request
export const get_marker = query(() => state.marker instanceof Marker);

let count = 0;

export const increment = command(() => (count += 1));
