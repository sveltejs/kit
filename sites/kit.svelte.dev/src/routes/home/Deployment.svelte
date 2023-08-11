<script>
	import { Section } from '@sveltejs/site-kit/components';
	import { theme } from '@sveltejs/site-kit/stores';

	import { base } from '$app/paths';
	import plus from '$lib/icons/plus.svg';
	import azure from './logos/azure.svg';
	import cloudflare from './logos/cloudflare.svg';
	import deno from './logos/deno.svg';
	import firebase from './logos/firebase.svg';
	import html5 from './logos/html5.svg';
	import lambda from './logos/lambda.svg';
	import netlify from './logos/netlify.svg';
	import node from './logos/node.svg';
	import vercel from './logos/vercel.svg';
</script>

<Section --background="var(--background-1)">
	<div class="grid" style="--columns: 3">
		<h2>deploy anywhere</h2>
		<div class="blurb">
			<p>
				Export static HTML files. Run your own Node server. Deploy code to the edge of the world. If
				a platform runs JavaScript, it runs SvelteKit — in some cases with <strong
					>zero configuration</strong
				>.
			</p>
			<p>Want to try deploying somewhere else? Swap out your adapter with a single line of code.</p>
		</div>
	</div>

	<div class="grid" style="--columns: 3">
		<div class="platforms left">
			<a
				target="_blank"
				rel="noreferrer"
				href="https://github.com/sveltejs/kit/tree/master/packages/adapter-static"
				class="invert"
			>
				<img src={html5} alt="" />
				<span><span class="large">Static</span> HTML</span>
			</a>
			<a
				target="_blank"
				rel="noreferrer"
				href="https://github.com/sveltejs/kit/tree/master/packages/adapter-node"
				class="invert"
			>
				<img src={node} alt="" />
				<span>Node.js</span>
			</a>
			<a
				target="_blank"
				rel="noreferrer"
				href="https://vercel.com/templates/svelte/sveltekit-boilerplate"
				class="invert invert-hover"
			>
				<img src={vercel} alt="" style="transform: translate(0,-0.2rem)" />
				<span>Vercel</span>
			</a>
			<a
				target="_blank"
				rel="noreferrer"
				href="https://github.com/sveltejs/kit/tree/master/packages/adapter-netlify"
			>
				<img src={netlify} alt="" />
				<span>Netlify</span>
			</a>
			<a
				target="_blank"
				rel="noreferrer"
				href="https://github.com/sveltejs/kit/tree/master/packages/adapter-cloudflare"
			>
				<img src={cloudflare} alt="" />
				<span>Cloudflare</span>
			</a>
		</div>

		<div class="platforms right">
			<a
				target="_blank"
				rel="noreferrer"
				href="https://github.com/jthegedus/svelte-adapter-firebase"
			>
				<img src={firebase} alt="" />
				<span>Firebase</span>
			</a>
			<a
				target="_blank"
				rel="noreferrer"
				href="https://github.com/pluvial/svelte-adapter-deno"
				class="invert invert-hover"
			>
				<img src={deno} alt="" />
				<span>Deno</span>
			</a>
			<a target="_blank" rel="noreferrer" href="https://github.com/MikeBild/sveltekit-adapter-aws">
				<img src={lambda} alt="" />
				<span>AWS</span>
			</a>
			<a
				target="_blank"
				rel="noreferrer"
				href="https://github.com/geoffrich/svelte-adapter-azure-swa"
			>
				<img src={azure} alt="" />
				<span>Azure</span>
			</a>
			<a target="_blank" rel="noreferrer" href="https://kit.svelte.dev/docs/adapters">
				<img src={plus} alt="" />
				<span>More...</span>
			</a>
		</div>

		<div class="globe">
			<img
				src="{base}/edge.svg?{$theme.current}"
				width="100%"
				height="100%"
				alt="Dynamically rendered map of the world, centered on the user's location"
			/>
			<span> rendered on the edge, just for you </span>
		</div>
	</div>
</Section>

<style>
	.globe {
		--max-size: 40rem;
		position: relative;
		width: 100%;
		max-height: var(--max-size);
		text-align: center;
		aspect-ratio: 1;
	}

	.globe img {
		max-width: var(--max-size);
		max-height: var(--max-size);
	}

	.globe span {
		position: absolute;
		bottom: -4rem;
		left: 0;
		width: 100%;
		color: var(--sk-text-3);
		font-size: var(--sk-text-xs);
	}

	.globe span::before {
		--size: 2rem;
		content: '';
		position: absolute;
		width: var(--size);
		height: var(--size);
		background: url($lib/icons/up-small.svg) no-repeat center;
		left: calc(50% - 0.5 * var(--size));
		top: -3rem;
	}

	.platforms {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 1rem;
		align-items: center;
	}

	.platforms a {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
		color: inherit;
	}

	.platforms.left {
		justify-content: flex-end;
		flex-direction: column-reverse;
	}

	.platforms a span {
		font-size: var(--sk-text-xs);
		color: var(--sk-text-3);
		text-align: center;
	}

	.platforms img {
		--size: 4rem;
		--invert: 0;
		--invert-hover: 0;
		width: var(--size);
		height: var(--size);
		object-fit: contain;
		filter: invert(var(--invert)) opacity(0.5) grayscale(100%);
		transition: filter 0.2s;
	}

	.platforms a:hover img,
	.platforms a:focus-visible img {
		filter: invert(var(--invert-hover));
		transition: none;
	}

	.platforms a:hover span,
	.platforms a:focus-visible span {
		color: var(--sk-text-1);
	}

	p {
		margin-top: 0;
	}

	.large {
		display: none;
	}

	@media (min-width: 600px) {
		.large {
			display: initial;
		}
	}

	@media (min-width: 900px) {
		.blurb {
			grid-column: 2 / 4;
		}

		.platforms {
			display: grid;
			grid-template-columns: none;
			grid-template-rows: repeat(4, 1fr);
			align-items: center;
		}

		.platforms a {
			--direction: -1;
			flex-direction: row;
			align-items: center;
			gap: 2rem;
			height: 100%;
		}

		.platforms.left {
			order: 1;
		}

		.globe {
			order: 2;
		}

		.platforms.right {
			order: 3;
		}

		.platforms a:first-child,
		.platforms a:last-child {
			transform: translate(calc(var(--direction) * 5rem), 0);
		}

		.platforms a:nth-child(2) {
			transform: translate(calc(var(--direction) * 1rem), -0.2rem);
		}

		.platforms a:nth-child(4) {
			transform: translate(calc(var(--direction) * 1rem), 0.2rem);
		}

		.platforms.left {
			justify-content: flex-end;
			flex-direction: row-reverse;
		}

		.platforms.left a {
			--direction: 1;
			flex-direction: row-reverse;
		}
	}

	@media (prefers-color-scheme: dark) {
		.platforms .invert img {
			--invert: 1;
		}

		.platforms .invert-hover img {
			--invert-hover: 1;
		}
	}

	:global(body.dark) .platforms .invert img {
		--invert: 1;
	}

	:global(body.dark) .platforms .invert-hover img {
		--invert-hover: 1;
	}
</style>
