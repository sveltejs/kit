<svelte:head>
	<title>Home</title>
</svelte:head>

<img src="svelte-welcome-light.png" alt="Svelte welcome text" />
<section>
	<h1>To my brand new<br />Svelte project</h1>
	<h2>
		Here’s where you’ll edit your content.<br />Have a look at
		<strong>src/routes/index.svelte</strong>
	</h2>
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
	}

	@media (min-width: 480px) {
		section {
			margin-top: -8rem;
		}
	}
</style>
