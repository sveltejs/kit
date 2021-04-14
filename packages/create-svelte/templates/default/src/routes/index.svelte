<script lang="ts">
	import Counter from '$lib/Counter/index.svelte';
</script>

<svelte:head>
	<title>Home</title>
</svelte:head>


<section>
	<h1>
		<img
			class="welcome"
			src="svelte-welcome.png"
			alt="Welcome"
		/>
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
