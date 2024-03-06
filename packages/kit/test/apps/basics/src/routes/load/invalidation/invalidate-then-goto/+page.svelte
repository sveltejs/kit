<script>
	import { invalidate, goto } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p class="layout">{data.layoutDate}</p>
<p class="page">{data.pageDate}</p>
<button
	type="button"
	class="invalidate"
	on:click={() => (window.promise = invalidate('invalidate-depends:goto'))}
>
	invalidate
</button>
<button
	type="button"
	class="goto"
	on:click={() => (window.promise = goto('/load/invalidation/invalidate-then-goto?x'))}
>
	goto
</button>
