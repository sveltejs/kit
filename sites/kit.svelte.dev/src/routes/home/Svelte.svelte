<script>
	import { Section } from '@sveltejs/site-kit/components';
	import Video from './Video.svelte';
</script>

<Section --background="var(--background-1)">
	<p class="definition">
		<em>/ˈsvɛlt/</em> <span class="adjective">adjectif</span>
		<span class="description"
			>qui produit une impression de légèreté, de souplesse, par sa forme élancée.</span
		>
	</p>

	<div class="grid" style="--columns: 3">
		<div class="video-container">
			<Video />

			<p>
				<a
					target="_blank"
					rel="noreferrer"
					href="https://www.offerzen.com/community/svelte-origins-documentary"
				>
					Regarder le documentaire Svelte Origins en entier
				</a>
			</p>
		</div>

		<div>
			<p>
				SvelteKit est construit par dessus Svelte, un framework d'interface qui utilise un
				compilateur pour vous permettre d'écrire des composants incroyablement concis qui effectuent
				le minimum de travail dans le navigateur, en utilisant des langages que vous connaissez
				déjà, HTML, CSS, JavaScript. <strong>C'est une lettre d'amour au développment web.</strong>
			</p>

			<p>
				Mais ne nous prenez pas au mot. Les développeurs et développeuses notent régulièrement
				Svelte comme le framework qu'
				<a
					target="_blank"
					rel="noreferrer"
					href="https://insights.stackoverflow.com/survey/2021#section-most-loved-dreaded-and-wanted-web-frameworks"
				>
					ils
				</a>
				ou
				<a
					target="_blank"
					rel="noreferrer"
					href="https://tsh.io/state-of-frontend/#which-of-the-following-frameworks-would-you-like-to-learn-in-the-future"
				>
					elles
				</a>
				<a
					target="_blank"
					rel="noreferrer"
					href="https://2021.stateofjs.com/en-US/libraries/front-end-frameworks/"
				>
					préfèrent
				</a>

				<a
					target="_blank"
					rel="noreferrer"
					href="https://twitter.com/Rich_Harris/status/1589675637195042817"
				>
					utiliser</a
				>.
			</p>
		</div>
	</div>
</Section>

<style>
	p {
		font-size: var(--sk-text-s);
	}

	.definition {
		font-size: var(--sk-text-l);
	}

	.definition em {
		font-style: normal;
		font-size: var(--sk-text-xxl);
		color: var(--sk-theme-1);
	}

	.definition .adjective {
		position: relative;
		top: -0.15em;
		padding: 0.25em 0.5em 0.1em;
		line-height: 1;
		margin: 0 1em;
		text-transform: uppercase;
		font-size: var(--sk-text-s);
		background: var(--sk-text-2);
		border-radius: var(--sk-border-radius);
		color: var(--sk-back-2);
	}

	.definition .description {
		display: block;
	}

	@media (min-width: 900px) {
		.definition .description {
			display: inline;
		}

		.video-container {
			order: 2;
			grid-column: 2 / 4;
		}
	}
</style>
