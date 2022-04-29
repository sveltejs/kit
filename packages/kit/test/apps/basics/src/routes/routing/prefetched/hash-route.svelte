<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	const modalContents = [
		{
			id: 'please-dont-show-me',
			title: 'Oopsie'
		}
	];

	let modal = undefined;

	const checkIfModalShouldBeShown = () => {
		console.log('mount');
		const modalToShow = $page.url.hash.substring(1);
		modal = modalContents.find(({ id }) => id === modalToShow);
	};

	onMount(checkIfModalShouldBeShown);
</script>

<svelte:window on:popstate={checkIfModalShouldBeShown} />

<h1>
	{modal?.title ?? ''}
</h1>
