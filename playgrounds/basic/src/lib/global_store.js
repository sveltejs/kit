// import { writable } from 'svelte/store';

import { unshared_writable } from '$app/stores';

export const global_counter = unshared_writable(0);