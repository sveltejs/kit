<script>
	import { Hero, Blurb } from '@sveltejs/site-kit';
</script>

<style>

</style>

<svelte:head>
	<title>Sapper • The next small thing in web development</title>
</svelte:head>

<Hero
	title="Sapper"
	tagline="The next small thing in web development"
	outline="sapper-logo-outline.svg"
	logotype="sapper-logotype.svg"
/>

<Blurb>
	<a href="https://svelte.dev" slot="one">
		<h2>Powered by Svelte</h2>
		<p>Sapper is an application framework powered by Svelte — build bigger apps with a smaller footprint</p>

		<span class="learn-more">learn more</span>
	</a>

	<a href="docs" slot="two">
		<h2>Best of both worlds</h2>
		<p>All the SEO and progressive enhancement of a server-rendered app, with the slick navigation of an SPA</p>

		<span class="learn-more">learn more</span>
	</a>

	<a href="docs" slot="three">
		<h2>Build fast</h2>
		<p>Hit the ground running with advanced routing, server-side rendering, code-splitting, offline support and more</p>

		<span class="learn-more">learn more</span>
	</a>

	<div class="description" slot="what">
		<p>Sapper is a framework for building web applications of all sizes, with a beautiful development experience and flexible filesystem-based routing.</p>

		<p>Unlike single-page apps, Sapper doesn't compromise on SEO, progressive enhancement or the initial load experience — but unlike traditional server-rendered apps, navigation is instantaneous for that app-like feel.</p>

		<p><a href="https://svelte.dev/blog/sapper-towards-the-ideal-web-app-framework">Read the introductory blog post</a> to learn more.</p>
	</div>

	<div style="grid-area: start; display: flex; flex-direction: column; min-width: 0" slot="how">
		<pre class="language-bash" style="margin: 0 0 1em 0; min-width: 0; min-height: 0">
# for Rollup
npx degit "sveltejs/sapper-template#rollup" my-app
# for webpack
npx degit "sveltejs/sapper-template#webpack" my-app
cd my-app

npm install
npm run dev & open http://localhost:3000
		</pre>

		<p class="cta"><a rel="prefetch" href="docs">Learn Sapper</a></p>
	</div>
</Blurb>
