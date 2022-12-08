<script>
	import Section from '@sveltejs/site-kit/components/Section.svelte';
	import html5 from './logos/html5.svg';
	import node from './logos/node.svg';
	import vercel from './logos/vercel.svg';
	import netlify from './logos/netlify.svg';
	import cloudflare from './logos/cloudflare.svg';
	import firebase from './logos/firebase.svg';
	import deno from './logos/deno.svg';
	import lambda from './logos/lambda.svg';
	import appengine from './logos/appengine.svg';
	import plus from '$lib/icons/plus.svg';
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
			<div class="invert">
				<img src={html5} alt="HTML5 logo" />
				<span><span class="large">Static</span> HTML</span>
			</div>
			<div class="invert">
				<img src={node} alt="Node logo" />
				<span>Node.js</span>
			</div>
			<div class="invert invert-hover">
				<img src={vercel} alt="Vercel logo" style="transform: translate(0,-0.2rem)" />
				<span>Vercel</span>
			</div>
			<div>
				<img src={netlify} alt="Netlify logo" />
				<span>Netlify</span>
			</div>
			<div>
				<img src={cloudflare} alt="Cloudflare logo" />
				<span>Cloudflare</span>
			</div>
		</div>

		<div class="platforms right">
			<div>
				<img src={firebase} alt="Firebase logo" />
				<span>Firebase</span>
			</div>
			<div class="invert invert-hover">
				<img src={deno} alt="Deno logo" />
				<span>Deno</span>
			</div>
			<div>
				<img src={lambda} alt="AWS Lambda logo" />
				<span>AWS</span>
			</div>
			<div>
				<img src={appengine} alt="AppEngine logo" />
				<span>AppEngine</span>
			</div>
			<div>
				<img src={plus} alt="Plus sign" />
				<span>More...</span>
			</div>
		</div>

		<div
			class="globe"
			role="img"
			aria-label="Dynamically rendered map of the world, centered on the user's location"
		>
			<span> rendered on the edge, just for you </span>
		</div>
	</div>
</Section>

<style>
	.globe {
		position: relative;
		width: 100%;
		max-height: 40rem;
		text-align: center;
		background: url(/edge.svg) no-repeat center;
		aspect-ratio: 1;
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

	.platforms div {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
	}

	.platforms.left {
		justify-content: flex-end;
		flex-direction: column-reverse;
	}

	.platforms div span {
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
	}

	.platforms div:hover img {
		filter: invert(var(--invert-hover));
	}

	.platforms div:hover span {
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

		.platforms div {
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

		.platforms div:first-child,
		.platforms div:last-child {
			transform: translate(calc(var(--direction) * 5rem), 0);
		}

		.platforms div:nth-child(2) {
			transform: translate(calc(var(--direction) * 1rem), -0.2rem);
		}

		.platforms div:nth-child(4) {
			transform: translate(calc(var(--direction) * 1rem), 0.2rem);
		}

		.platforms.left {
			justify-content: flex-end;
			flex-direction: row-reverse;
		}

		.platforms.left div {
			--direction: 1;
			flex-direction: row-reverse;
		}
	}

	@media (prefers-color-scheme: dark) {
		.globe {
			background-image: url(/edge.svg?dark);
		}

		.invert img {
			--invert: 1;
		}

		.invert-hover img {
			--invert-hover: 1;
		}
	}
</style>
