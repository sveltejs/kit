<script lang="ts">
	import Counter from '$lib/Counter/index.svelte';
</script>

<svelte:head>
	<title>Home</title>
</svelte:head>

<section>
	<h1>
		<picture>
			<source srcset="svelte-welcome-compressed.webp" type="image/webp">
			<img
				class="welcome"
				width="2048"
				height="495"
				src="svelte-welcome-compressed.png"
				alt="Welcome"
			/>
		</picture>
		to your brand new<br />Svelte project
	</h1>

	<h2>
		try editing <strong>src/routes/index.svelte</strong>
	</h2>

	<Counter />
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
	}

	h1 {
		font-size: calc(8px + 3.5vw);
		margin: 0 0 1rem 0;
	}

	.welcome {
		width: 100%;
		height: auto;
		max-width: 1024px;
		display: block;
		margin-bottom: -10%;
	}

	@media (min-width: 1024px) {
		h1 {
			font-size: 43.84px;
		}
	}
</style>
