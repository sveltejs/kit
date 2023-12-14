<script>
	import { pushState } from '$app/navigation';
	import { page } from '$app/stores';

	export let data;
	let a = 1;
</script>

<p>{data.x}</p>
<p>{$page.state.a}</p>
<button
	on:click={() => {
		a++;
		pushState('/bar/' + a, { a });
	}}>push</button
>
<a href="/bar/20" data-sveltekit-replacestate>bar/20</a>
