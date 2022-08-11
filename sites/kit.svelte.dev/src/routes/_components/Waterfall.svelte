<script>
	import Server from './waterfall-server.png';
	import Client from './waterfall-client.png';
</script>

<h3>Goodbye Waterfalls</h3>

<div class="flex-container">

	<div class="flex-child">
		Traditional multi-page apps have to load all resources
		<img src={Server} alt="Server-side rendered page waterfall" />
	</div>

	<div class="flex-child">
		SvelteKit's client-side routing loads only what's changed
		<img src={Client} alt="Client-side rendered page waterfall" />
	</div>

</div>

<style>
	.flex-container {
		display: flex;
		color: white;
		text-align: center;
	}

	.flex-child {
		flex: 1;
		padding: 1rem;
	} 

	img {
		max-width:100%;
		margin-top: 0.8rem;
	}

	h3 {
		margin: 2rem 0 0.8rem;
		text-align: center;
	}
</style>
