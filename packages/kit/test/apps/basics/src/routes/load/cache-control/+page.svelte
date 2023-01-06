<script>
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { _force_next_fetch } from './+page';

	/** @type {import('./$types').PageData} */
	export let data;

	/** @param {'default' | 'force' | 'bust'} type */
	async function fetch_again(type) {
		const test = $page.url.searchParams.get('test');

		if (__SVELTEKIT_DEBUG__) console.debug(`fetch_again with type ${type}`);

		const inc_response = await fetch('/load/cache-control/increment?test=' + test);
		if (__SVELTEKIT_DEBUG__) console.debug(`got increment response with status code ${inc_response.status}`);
		await fetch(`/load/cache-control/echo?msg=` + encodeURIComponent(`test ${test} incremented`));

		if (type === 'force') {
			_force_next_fetch();
			await fetch(`/load/cache-control/echo?msg=` + encodeURIComponent(`test ${test} forced`));
		} else if (type === 'bust') {
			const count_response = await fetch('/load/cache-control/count', { method: 'POST' });
			if (__SVELTEKIT_DEBUG__) console.debug(`got count POST response with status code ${count_response.status}`);
			await fetch(`/load/cache-control/echo?msg=` + encodeURIComponent(`test ${test} busted`));
		}

		if (__SVELTEKIT_DEBUG__) console.debug("calling invalidate('/load/cache-control/count')");
		await invalidate('/load/cache-control/count');
		await fetch(`/load/cache-control/echo?msg=` + encodeURIComponent(`test ${test} invalidated`));
	}
</script>

<p>Count is {data.count}</p>
<button class="default" on:click={() => fetch_again('default')}>Fetch again</button>
<button class="force" on:click={() => fetch_again('force')}>Fetch again (force reload)</button>
<button class="bust" on:click={() => fetch_again('bust')}>Fetch again (prior POST request)</button>
