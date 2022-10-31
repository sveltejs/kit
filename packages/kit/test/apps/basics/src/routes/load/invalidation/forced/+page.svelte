<script>
	import { invalidateAll, goto } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>a: {data.a}, b: {data.b}</h1>

<button
	class="invalidateall"
	on:click={() => {
		window.promise = invalidateAll();
	}}>invalidate</button
>

<button
	class="goto"
	on:click={() => {
		window.promise = goto('/load/invalidation/forced?test', { invalidateAll: true });
	}}>goto</button
>
