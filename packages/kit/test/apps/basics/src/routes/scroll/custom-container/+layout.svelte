<div class="shell" data-sveltekit-scroll-container="false">
	<nav>
		<a href="/scroll/custom-container/a">a</a>
		<a href="/scroll/custom-container/b">b</a>
	</nav>

	<main id="scroll-container" data-sveltekit-scroll-container>
		<slot />
	</main>
</div>

<style>
	.shell {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
	}

	nav {
		flex: none;
		padding: 0.5rem;
	}

	main {
		flex: 1;
		overflow: auto;
	}
</style>
