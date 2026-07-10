<script>
	import { refreshAll, goto } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>a: {data.a}, b: {data.b}</h1>

<button
	class="refreshall"
	onclick={() => {
		window.promise = refreshAll();
	}}>refresh</button
>

<button
	class="goto"
	onclick={() => {
		window.promise = goto('/load/invalidation/forced-goto?test', { invalidateAll: true });
	}}>goto</button
>
