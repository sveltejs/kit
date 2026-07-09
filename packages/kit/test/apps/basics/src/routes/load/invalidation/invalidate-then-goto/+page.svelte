<script>
	import { refresh, goto } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p class="layout">{data.layoutDate}</p>
<p class="page">{data.pageDate}</p>
<button
	type="button"
	class="refresh"
	onclick={() => (window.promise = refresh('invalidate-depends:goto'))}
>
	refresh
</button>
<button
	type="button"
	class="goto"
	onclick={() => (window.promise = goto('/load/invalidation/invalidate-then-goto?x'))}
>
	goto
</button>
