<script>
	const adapters = Object.entries({
		'Vercel': '@sveltejs/adapter-vercel',
		'Netlify': '@sveltejs/adapter-netlify',
		'Cloudflare': '@sveltejs/adapter-cloudflare-pages',
		'your server': '@sveltejs/adapter-node',
		'static hosting': '@sveltejs/adapter-static',
		'Firebase': 'svelte-adapter-firebase',
		'Deno': 'svelte-adapter-deno',
		'AppEngine': 'svelte-adapter-appengine'
	});

	let i = 0;
	let host;
	let adapter;

	function update() {
		[host, adapter] = adapters[i];
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
		<h3>{host} →</h3>
	</div>

	<div class="code-container">
		<pre class="code"><code>import adapter from '{adapter}';

export default &#123;
	kit: &#123;
		adapter: adapter()
	}
}</code></pre>
	</div>

</div>

<style>
	.container {
		display: grid;
		grid-template-columns: repeat(4, 25%);
		gap: 10px;
		width: 100%;
	}

	.anywhere {
		margin: 50px 0 0;
	}

	.host {
		margin: 75px 0 0;
		text-align: center;
	}

	.code-container {
		grid-column: 3 / span 2;
	}

	.code {
		max-width: 575px;
		text-align: left;
		padding: 1em;
		background: var(--back-light);
		box-shadow: inset 1px 1px 3px rgba(81, 81, 81, 0.2);
	}
</style>
