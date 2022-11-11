<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p class="shared">{data.shared}</p>
<button
	type="button"
	class="shared"
	on:click={() => (window.promise = invalidate('invalidate-depends:shared'))}
>
	invalidate shared
</button>

<p class="server">{data.server}</p>
<button
	type="button"
	class="server"
	on:click={() => (window.promise = invalidate('invalidate-depends:server'))}
>
	invalidate server
</button>
