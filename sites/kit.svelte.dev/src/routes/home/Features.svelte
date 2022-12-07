<script>
	import Section from '@sveltejs/site-kit/components/Section.svelte';
</script>

<Section>
	<div class="container">
		<div class="features">
			<h2><span>features? we got 'em.</span></h2>
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
				<strong>Content Security Policy</strong> configuration. Keep your secrets to yourself with
				advanced <strong>environment variable</strong> handling. Handle errors gracefully and
				<strong>securely</strong>. Load data
				<strong>directly from your database</strong>
				and connect your back end to your front end with <strong>type-safe</strong> data loading and
				built-in <strong>form actions</strong>
				that work with or without JavaScript. <strong>Co-exist</strong> with other client-side
				routing frameworks on the same page. Add <strong>service workers</strong> for offline
				support and <strong>progressive web apps</strong>. Generate <strong>AMP-compliant</strong>
				pages if you really have to. Build complex UIs with unusually powerful
				<strong>filesystem-based routes</strong>. Nested layouts? Duh. Learn
				<strong>web standards</strong>
				that work across environments. Integrate with <strong>Tailwind</strong> and
				<strong>GraphQL</strong>
				and <strong>Playwright</strong> and <strong>Vitest</strong> and <strong>Storybook</strong>
				and, well, whatever you want. Build <strong>libraries</strong> as well as apps.
				<strong>Deploy anywhere</strong> with adapters.
			</p>

			<p>
				SvelteKit is the framework that
				<strong>grows with you</strong>, whatever you end up building.
			</p>
		</div>
	</div>
</Section>

<style>
	.container {
		display: flex;
		flex-direction: column;
	}

	.features {
		order: 1;
	}

	h2 {
		float: left;
		margin-top: 7rem;
		width: 5.5em;
		shape-outside: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="0" y="0" width="100" height="100"></rect></svg>');
	}

	h2 span {
		display: block;
		width: 5em;
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

		.features {
			text-align: justify;
			padding: 2rem 0 2rem calc(0 * var(--size));
		}
	}

	@media (min-width: 900px) {
		.container {
			--size: 45rem;
		}

		.features {
			padding-top: clamp(0px, calc(23.333vw - 210px), 70px);
		}
	}
</style>
