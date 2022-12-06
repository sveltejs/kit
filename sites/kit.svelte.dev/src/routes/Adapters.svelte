<script>
	import Vercel from './logo-vercel.svg';
	import Netlify from './logo-netlify.svg';
	import Cloudflare from './logo-cloudflare.svg';
	import HTML from './logo-html5.svg';
	import Node from './logo-nodejs.svg';
	import Firebase from './logo-firebase.svg';
	import Deno from './logo-deno.svg';
	import AppEngine from './logo-appengine.svg';

	const adapters = [
		{ display: 'Vercel', package: '@sveltejs/adapter-vercel', image: Vercel },
		{ display: 'Netlify', package: '@sveltejs/adapter-netlify', image: Netlify },
		{ display: 'Cloudflare', package: '@sveltejs/adapter-cloudflare', image: Cloudflare },
		{ display: 'your server', package: '@sveltejs/adapter-node', image: HTML },
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

<h2>Deploy Anywhere</h2>

<div class="container">

	<div class="anywhere">
		<p>SvelteKit builds instant, optimized bundles with the Svelte compiler and code-splitting.</p>
		<p>Deploy to over 20 different platforms with community adapters by changing just a single line of code.</p>
	</div>

	<div class="host">
		<h3>{adapter.display}</h3>
		<img src={adapter.image} alt="" />
	</div>

	<div class="code-container">
		<!-- This has to be prerendered through a complicated pipeline.
			   I just wrote an FAQ with this code block and then copied the output here.
				 Needed to encode the curly braces and then update the dynamic part. -->
		<div class="text"><pre class="shiki twoslash lsp" style="background-color: var(--shiki-color-background); color: var(--shiki-color-text)"><div class="language-id">ts</div><div class="code-container"><code><div class="line"><span style="color: var(--shiki-token-keyword)">import</span><span style="color: var(--shiki-color-text)"> <data-lsp lsp="(alias) function adapter(options?: AdapterOptions): <a href=&quot;/docs/types#sveltejs-kit-adapter&quot;>Adapter</a>&amp;#10;import adapter">adapter</data-lsp> </span><span style="color: var(--shiki-token-keyword)">from</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-string-expression)">'{adapter.package}'</span><span style="color: var(--shiki-color-text)">;</span></div><div class="line">&nbsp;</div><div class="line"><span style="color: var(--shiki-token-keyword)">export</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-keyword)">default</span><span style="color: var(--shiki-color-text)"> &lcub;</span></div><div class="line"><span style="color: var(--shiki-color-text)">  <data-lsp lsp="(property) kit: &lcub;&amp;#10;    adapter: <a href=&quot;/docs/types#sveltejs-kit-adapter&quot;>Adapter</a>;&amp;#10;}">kit</data-lsp></span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> &lcub;</span></div><div class="line"><span style="color: var(--shiki-color-text)">    <data-lsp lsp="(property) adapter: <a href=&quot;/docs/types#sveltejs-kit-adapter&quot;>Adapter</a>">adapter</data-lsp></span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)"><data-lsp lsp="(alias) adapter(options?: AdapterOptions | undefined): <a href=&quot;/docs/types#sveltejs-kit-adapter&quot;>Adapter</a>&amp;#10;import adapter">adapter</data-lsp></span><span style="color: var(--shiki-color-text)">()</span></div><div class="line"><span style="color: var(--shiki-color-text)">  &rcub;</span></div><div class="line"><span style="color: var(--shiki-color-text)">&rcub;</span></div></code></div></pre></div>
	</div>

</div>

<style>
	h2 {
		margin-bottom: 1em;
	}

	.container {
		display: grid;
		grid-template-columns: repeat(10, minmax(0, 1fr));
		gap: 10px;
		width: 100%;
	}

	.host {
		text-align: center;
		display: none;
	}

	.anywhere {
		grid-column: span 10 / span 10;
		line-height: 200%;
	}

	.code-container {
		grid-column: span 10 / span 10;
	}

	.code-block {
		max-width: 450px;
	}

	@media (min-width: 640px) {
		.anywhere {
			grid-column: span 10 / span 10;
		}
		.host {
			grid-column: span 3 / span 3;
			display: block;
		}
		.code-container {
			grid-column: span 7 / span 7;
		}
	}

	@media (min-width: 1024px) {
		.anywhere {
			grid-column: span 3 / span 3;
		}
		.host {
			grid-column: span 3 / span 3;
		}
		.code-container {
			grid-column: span 4 / span 4;
		}
	}
</style>
