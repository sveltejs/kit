<script>
	import { refresh } from '$app/navigation';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<p class="shared">{data.shared}</p>
<button
	type="button"
	class="shared"
	onclick={() => (window.promise = refresh('invalidate-depends:shared'))}
>
	refresh shared
</button>

<p class="server">{data.server}</p>
<button
	type="button"
	class="server"
	onclick={() => (window.promise = refresh('invalidate-depends:server'))}
>
	refresh server
</button>

<p class="neither">neither</p>
<button
	type="button"
	class="neither"
	onclick={() => (window.promise = refresh('invalidate-depends:neither'))}
>
	refresh neither
</button>
