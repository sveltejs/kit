<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();

	function update_q() {
		// @ts-expect-error set is not in the types; we wanna test here that we guard against mutation in goto, too
		page.url.searchParams.set('q', 'updated');
		// @ts-expect-error
		goto(page.url);
	}
</script>

<h1>{data.q}</h1>
<button onclick={update_q}>update q</button>
