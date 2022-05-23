<script context="module">
	let load_calls = 0;

	export const load = () => {
		load_calls += 1;
		return { props: { calls: load_calls } };
	};
</script>

<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	export let calls;

	const modal_contents = {
		'please-dont-show-me': {
			title: 'Oopsie'
		},
		'please-dont-show-me-jr': {
			title: 'Oopsie Jr.'
		}
	};

	let modal = undefined;

	const show_modal = () => {
		const hash = $page.url.hash.substring(1);
		modal = modal_contents[hash];
	};

	onMount(show_modal);
</script>

<svelte:window on:popstate={show_modal} />

<h1>{modal?.title ?? ''}</h1>
<p>Loaded {calls} times.</p>
