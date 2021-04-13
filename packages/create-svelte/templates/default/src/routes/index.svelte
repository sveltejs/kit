<script lang="ts">
	import Counter from '$lib/Counter.svelte';
	import { isDarkModeStore } from '../stores';

	let isDarkMode = true;

	isDarkModeStore.subscribe((value) => (isDarkMode = value));
</script>

<svelte:head>
	<title>Home</title>
</svelte:head>

<img
	src={isDarkMode ? 'svelte-welcome.png' : 'svelte-welcome-light.png'}
	alt="Svelte welcome text"
/>
<section>
	<h1>To my brand new<br />Svelte project</h1>
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
	}

	section {
		margin-top: -2rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		transition: margin-top 0.3s linear;
	}

	@media (min-width: 768px) {
		section {
			margin-top: -8rem;
		}
	}
</style>
