<script>
	import { invalidate } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p class="shared">{data.shared}</p>
<button
	type="button"
	class="shared"
	onclick={() => (window.promise = invalidate('invalidate-depends:shared'))}
>
	invalidate shared
</button>

<p class="server">{data.server}</p>
<button
	type="button"
	class="server"
	onclick={() => (window.promise = invalidate('invalidate-depends:server'))}
>
	invalidate server
</button>

<p class="neither">neither</p>
<button
	type="button"
	class="neither"
	onclick={() => (window.promise = invalidate('invalidate-depends:neither'))}
>
	invalidate neither
</button>
