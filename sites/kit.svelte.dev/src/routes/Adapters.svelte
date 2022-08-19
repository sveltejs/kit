<script>
	import Vercel from './logo-vercel.svg';
	import Netlify from './logo-netlify.svg';
	import Cloudflare from './logo-cloudflare.svg';
	import Node from './logo-nodejs.svg';
	import Firebase from './logo-firebase.svg';
	import Deno from './logo-deno.svg';
	import AppEngine from './logo-appengine.svg';

	const adapters = [
		{ display: 'Vercel', package: '@sveltejs/adapter-vercel', image: Vercel },
		{ display: 'Netlify', package: '@sveltejs/adapter-netlify', image: Netlify },
		{ display: 'Cloudflare', package: '@sveltejs/adapter-cloudflare', image: Cloudflare },
		{ display: 'your server', package: '@sveltejs/adapter-node', image: Node },
		{ display: 'static hosting', package: '@sveltejs/adapter-static', image: Node },
		{ display: 'Firebase', package: 'svelte-adapter-firebase', image: Firebase },
		{ display: 'Deno', package: 'svelte-adapter-deno', image: Deno },
		{ display: 'AppEngine', package: 'svelte-adapter-appengine', image: AppEngine },
	];

	let i = 0;
	let adapter;

	function update() {
		adapter = adapters[i];
		i = (i + 1) % adapters.length;
		setTimeout(update, 2200);
	}

	update();
</script>

<div class="container">

	<div class="anywhere">
		<h3>Deploy Anywhere</h3>
		SvelteKit builds instant, optimized bundles with the Svelte compiler and code-splitting.
	</div>

	<div class="host">
		<h3>{adapter.display} →</h3>
		<img src={adapter.image} />
	</div>

	<div class="code-container">
		<pre class="code"><code>import adapter from '{adapter.code}';

export default &lbrace;
	kit: &lbrace;
		adapter: adapter()
	&rbrace;
&rbrace;</code></pre>
	</div>

</div>

<style>
	.container {
		display: grid;
		grid-template-columns: repeat(4, 25%);
		gap: 10px;
		width: 100%;
	}

	.host {
		margin: 15px 0 0;
		text-align: center;
		display: none;
	}

	.anywhere {
		grid-column: span 4 / span 4;
		margin-bottom: 50px;
	}

	.code-container {
		grid-column: span 4 / span 4;
	}

	.code {
		max-width: 450px;
		text-align: left;
		padding: 1em;
		background: var(--back-light);
		box-shadow: inset 1px 1px 3px rgba(81, 81, 81, 0.2);
	}

	@media (min-width: 640px) {
		.anywhere {
			grid-column: span 4 / span 4;
		}
		.host {
			display: block;
		}
		.code-container {
			grid-column: span 3 / span 3;
		}
	}

	@media (min-width: 1024px) {
		.anywhere {
			grid-column: span 1 / span 1;
		}
		.code-container {
			grid-column: span 2 / span 2;
		}
	}
</style>
