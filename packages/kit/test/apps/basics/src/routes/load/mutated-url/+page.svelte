<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	/** @type {import('./$types').PageData} */
	export let data;

	function update_q() {
		$page.url.searchParams.set('q', 'updated');
		goto($page.url);
	}
</script>

<h1>{data.q}</h1>
<button on:click={update_q}>update q</button>
