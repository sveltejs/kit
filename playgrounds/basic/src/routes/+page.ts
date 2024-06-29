import { global_counter } from '$lib/global_store';

export async function load() {
    // increment the counter on every page load, but it will always stay at 1 because requests are isolated
    global_counter.update((count) => count + 1);
}