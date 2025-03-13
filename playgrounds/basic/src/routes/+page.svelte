<script lang="ts">
	import type { PageData } from './$types';
	import { add, multiply } from '$lib/foo.remote.ts';

	let { data }: { data: PageData } = $props();
</script>

<h1>Welcome to SvelteKit</h1>

<button
	onclick={async () => {
		const result = await add(2, 3);
		console.log(result);
	}}>add</button
>

<button
	onclick={async () => {
		const result = await multiply(2, 3);
		console.log(result);
	}}>multiply</button
>
