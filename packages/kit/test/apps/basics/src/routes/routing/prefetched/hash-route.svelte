<script context="module">
	let loadCalls = 0;

	export const load = () => {
		loadCalls += 1;
		return { props: { calls: loadCalls } };
	};
</script>

<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	export let calls;

	const modalContents = {
		'please-dont-show-me': {
			title: 'Oopsie'
		},
		'please-dont-show-me-jr': {
			title: 'Oopsie Jr.'
		}
	};

	let modal = undefined;

	const checkIfModalShouldBeShown = () => {
		const modalToShow = $page.url.hash.substring(1);
		modal = modalContents[modalToShow];
	};

	onMount(checkIfModalShouldBeShown);
</script>

<svelte:window on:popstate={checkIfModalShouldBeShown} />

<h1>
	{modal?.title ?? ''}
</h1>

<p>
	Loaded {calls} times.
</p>
