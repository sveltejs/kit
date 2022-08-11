<script>
	const adapters = Object.entries({
		'Vercel': '@sveltejs/adapter-vercel',
		'Netlify': '@sveltejs/adapter-netlify',
		'Cloudflare': '@sveltejs/adapter-cloudflare-pages',
		'your own server': '@sveltejs/adapter-node',
		'static hosting': '@sveltejs/adapter-static',
		'Firebase': 'svelte-adapter-firebase',
		'Deno': 'svelte-adapter-deno',
		'AppEngine': 'svelte-adapter-appengine'
	});

	let i = 0;
	let host;
	let adapter;

	function updateAdapter() {
		[host, adapter] = adapters[i];
		i = (i + 1) % adapters.length;
		setTimeout(updateAdapter, 1500);
	}

	updateAdapter();
</script>

<h3>Deploy Anywhere</h3>

Deploy to {host}

<pre class="code"><code>import adapter from '{adapter}';

export default &#123;
	kit: &#123;
		adapter: adapter()
	}
}</code></pre>

<style>
	h3 {
		margin-bottom: 0.8rem;
	}

	.code {
		max-width: 575px;
		text-align: left;
		padding: 1em;
		background: var(--back-light);
		box-shadow: inset 1px 1px 3px rgba(81, 81, 81, 0.2);
	}
</style>
