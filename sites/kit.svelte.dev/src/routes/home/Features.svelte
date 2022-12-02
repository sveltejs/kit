<script>
	import Section from '@sveltejs/site-kit/components/Section.svelte';
</script>

<Section>
	<div class="container">
		<img
			class="globe"
			src="/edge.svg"
			alt="Dynamically rendered map of the world, centered on the user's location"
			style="grid-column: 1 / 3"
		/>

		<div class="features">
			<h2>features? we got 'em.</h2>
			<p>
				Mix and match <strong>prerendered</strong> pages for maximum performance with dynamic
				<strong>server-side rendering</strong> for maximum flexibility. Turn your app into a
				client-rendered
				<strong>PWA</strong> with a single line of code, for the whole thing or just one page. Use
				accessible <strong>client-side routing</strong> with automatic
				<strong>preloading</strong> for slick, instantaneous navigation that doesn't reload your
				entire page (and your analytics, and all that other junk). Protect your users with automatic
				<strong>CSRF protection</strong>
				and easy-to-use
				<strong>Content Security Policy</strong> configuration. Connect your back end to your front
				end with <strong>type-safe</strong> data loading and built-in <strong>form actions</strong>
				that work with or without JavaScript. Build complex UIs with unusually powerful
				<strong>filesystem-based routes</strong>. Nested layouts? Duh. Learn
				<strong>web standards</strong>
				that work across environments.
				<strong>Deploy anywhere</strong> with adapters.
			</p>

			<p>
				SvelteKit is the framework that
				<strong>grows with you</strong>, from your local machine
				<strong>to the edge of the world.</strong>
			</p>
		</div>
	</div>
</Section>

<style>
	.container {
		display: flex;
		flex-direction: column;
	}

	.globe {
		width: 100%;
		order: 2;
	}

	.features {
		order: 1;
	}

	strong {
		color: var(--sk-theme-2);
	}

	@media (min-width: 600px) {
		/* TODO remove the 62.5% hack so we can use rems in media queries */
		.container {
			--size: 40rem;
			display: block;
		}

		.globe {
			float: left;
			max-width: var(--size);
			shape-outside: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>');

			/*
				we want to lerp from r1 to r2 between two breakpoints d1 and d2.
				the problem to solve is this:

					clamp(r1, calc([100 * rate]vw + [offset]px) r2);

					rate = (r2 - r1) / (d2 - d1)
					offset = r1 + (d1 * rate)

				In this case we have

					r1 = -150px
					r2 = -100px
					d1 = 600px (the current breakpoint)
					d2 = 800px (the next breakpoint)

				therefore

					rate = (-100 - -150) / (800 - 600) = 50 / 200 = 0.25, hence 25vw
					offset = -150 - (600 * 0.25) = -150 - 150 = -300px
			*/
			margin: calc(150px - 0vw) 0 0 clamp(-150px, calc(25vw - 300px), -100px);
		}

		.features {
			text-align: justify;
			padding: 2rem 0 2rem calc(0 * var(--size));
		}
	}

	@media (min-width: 900px) {
		.container {
			--size: 45rem;
		}
		.globe {
			margin-top: 0;
		}

		.features {
			padding-top: clamp(0px, calc(23.333vw - 210px), 70px);
		}
	}
</style>
