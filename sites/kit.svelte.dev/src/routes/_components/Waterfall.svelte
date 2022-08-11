<script>
	import Waterfall from './waterfall.png';
	import Preload from './waterfall-none.png';
</script>

<h3>Goodbye Waterfalls</h3>

<div class="flex-container">

	<div class="flex-child">
		<img src={Waterfall} alt="Most sites have waterfalls that slow down page loads" />
	</div>

	<div class="flex-child">
		<img src={Preload} alt="SvelteKit preloads scripts the page will need to make thing speedy" />
	</div>

</div>

<style>
	.flex-container {
		display: flex;
	}

	.flex-child {
		flex: 1;
		padding: 1rem;
	} 

	img {
		max-width:100%;
	}

	h3 {
		margin: 4rem 0 0.8rem;
		color: white;
		text-align: center;
	}
</style>
