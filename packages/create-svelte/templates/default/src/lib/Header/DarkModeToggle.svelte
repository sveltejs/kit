<script lang="ts">
	import { afterUpdate } from 'svelte';
	import { isDarkModeStore } from '../../stores';

	let isDarkMode = false;

	afterUpdate(() => {
		window.document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
	});

	$: {
		isDarkModeStore.set(isDarkMode);
	}

	const toggleMode = () => {
		isDarkMode = !isDarkMode;
	};
</script>

<button on:click={toggleMode} aria-label="Toggle theme mode between light and dark">
	{#if isDarkMode}
		<img src="sun-icon.svg" alt="Toggle theme mode to light" />
	{:else}
		<img src="moon-icon.svg" alt="Toggle theme mode to dark" />
	{/if}
</button>

<style>
	button {
		width: 100%;
		height: 100%;
		background-color: transparent;
		border: 0;
	}
</style>
