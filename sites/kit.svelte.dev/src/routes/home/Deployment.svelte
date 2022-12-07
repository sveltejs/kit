<script>
	import Section from '@sveltejs/site-kit/components/Section.svelte';
</script>

<Section>
	<h2>deploy anywhere</h2>
	<div class="grid" style="--columns: 3">
		<div class="platforms">
			<p>one</p>
			<p>two</p>
			<p>three</p>
			<p>four</p>
		</div>

		<img
			class="globe"
			src="/edge.svg"
			alt="Dynamically rendered map of the world, centered on the user's location"
		/>

		<div class="platforms">
			<p>one</p>
			<p>two</p>
			<p>three</p>
			<p>four</p>
		</div>
	</div>
</Section>

<style>
	.globe {
		width: 100%;
		aspect-ratio: 1;
	}

	@media (min-width: 900px) {
	}
</style>
