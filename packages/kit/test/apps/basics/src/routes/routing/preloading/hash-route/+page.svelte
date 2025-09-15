<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	let { data } = $props();

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
		const hash = page.url.hash.substring(1);
		modal = modal_contents[hash];
	};

	onMount(show_modal);
</script>

<svelte:window on:popstate={show_modal} />

<h1>{modal?.title ?? ''}</h1>
<p>Loaded {data.calls} times.</p>
