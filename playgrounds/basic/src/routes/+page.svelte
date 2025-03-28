<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { add, multiply, multiply2, divide } from '$lib/foo.remote.ts';

	let { data }: { data: PageData } = $props();
</script>

<h1>Welcome to SvelteKit</h1>

<div>From load fn: {data.sum}</div>

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

<form {...divide.form}>
	<input name="a" value="2" />
	<input name="b" value="1" />
	<button>divide ({divide.result})</button>
	<button {...multiply2.formAction}>multiply2 ({multiply2.result})</button>
</form>
