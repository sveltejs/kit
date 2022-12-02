<script>
	import Section from '@sveltejs/site-kit/components/Section.svelte';
</script>

<Section>
	<div>
		<img
			class="globe"
			src="/edge.svg"
			alt="Dynamically rendered map of the world, centered on the user's location"
			style="grid-column: 1 / 3"
		/>

		<div class="features" style="text-align: justify">
			<p>
				Mix and match <strong>prerendered</strong> pages for maximum performance with dynamic
				<strong>server-side rendering</strong> for maximum flexibility. Turn your app into a
				client-rendered
				<strong>PWA</strong> with a single line of code, for the whole thing or just one page.
			</p>

			<p>
				Use accessible <strong>client-side routing</strong> with automatic
				<strong>preloading</strong> for slick, instantaneous navigation that doesn't reload your entire
				page (and your analytics, and all that other junk).
			</p>

			<p>
				Protect your users with automatic <strong>CSRF protection</strong> and easy-to-use
				<strong>Content Security Policy</strong> configuration.
			</p>

			<p>
				Connect your back end to your front end with <strong>type-safe</strong> data loading and
				built-in <strong>form actions</strong> that work with or without JavaScript.
			</p>

			<p>
				Build complex UIs with unusually powerful <strong>filesystem-based routes</strong>. Nested
				layouts? We got 'em.
			</p>

			<p>
				Learn <strong>web standards</strong> that work across environments.
				<strong>Deploy anywhere</strong> with adapters. SvelteKit is the framework that
				<strong>grows with you</strong>, from your local machine
				<strong>to the edge of the world.</strong>
			</p>
		</div>
	</div>
</Section>

<style>
	.globe {
		float: left;
		width: 100%;
		max-width: 40rem;
		shape-outside: circle(50%);
		margin: 0 5% 0 0;
	}

	strong {
		color: var(--sk-theme-2);
	}
</style>
