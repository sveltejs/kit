<script lang="ts">
	import '../app.css';
</script>

<main>
	<slot />
</main>

<footer>
	<img src="svelte-logo.png" alt="Svelte Logo" />
	<p>Visit <a href="https://svelte.dev">svelte.dev</a> to learn more on how to build Svelte apps</p>
</footer>

<style>
	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 40px;
	}

	footer a {
		font-weight: bold;
		color: var(--text-color);
		text-decoration: none;
	}

	footer a:hover {
		text-decoration: underline;
	}

	@media (min-width: 480px) {
		footer {
			padding: 40px 0;
		}
	}
</style>
