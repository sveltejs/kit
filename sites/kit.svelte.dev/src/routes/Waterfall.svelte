<script>
	import Server from './waterfall-server.png';
	import Client from './waterfall-client.png';
</script>

<h3>Goodbye Waterfalls</h3>

<div class="container">

	<div class="child">
		Traditional multi-page apps have to load all resources
		<img src={Server} alt="Server-side rendered page waterfall" />
	</div>

	<div class="child">
		SvelteKit's client-side routing loads only what's changed
		<img src={Client} alt="Client-side rendered page waterfall" />
	</div>

</div>

<style>
	.container {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		color: white;
		text-align: center;
	}

	.child {
		padding: 1rem;
	}

	img {
		width: 100%;
		height: auto;
		margin-top: 0.8rem;
	}

	h3 {
		margin: 2rem 0 0.8rem;
		text-align: center;
	}

	@media (min-width: 1024px) {
		.container {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
