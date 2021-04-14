<script lang="ts">
	import Counter from '$lib/Counter.svelte';
	import { isDarkModeStore } from '../stores';

	let isDarkMode = true;

	isDarkModeStore.subscribe((value) => (isDarkMode = value));
</script>

<svelte:head>
	<title>Home</title>
</svelte:head>


<section>
	<h1>
		<img
			src={isDarkMode ? 'svelte-welcome.png' : 'svelte-welcome-light.png'}
			alt="Welcome"
		/>
		to your brand new<br />Svelte project
	</h1>

	<h2>
		Here’s where you’ll edit your content.<br />Have a look at
		<strong>src/routes/index.svelte</strong>
	</h2>

	<Counter />
</section>

<style>
	img {
		width: 100%;
		max-width: 1024px;
		display: block;
	}

	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}
</style>
