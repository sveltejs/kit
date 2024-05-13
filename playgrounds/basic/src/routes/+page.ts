import { global_counter } from '$lib/global_store';
import { get } from 'svelte/store';

export async function load() {
    global_counter.update((count) => count + 1);
    const v = get(global_counter);

    console.log('load', v);
}