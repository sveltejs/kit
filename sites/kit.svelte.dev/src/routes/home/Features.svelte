<script>
	import { Section } from '@sveltejs/site-kit/components';
</script>

<Section --background="var(--sk-back-1)">
	<div class="container">
		<div class="features">
			<h2><span>des fonctionnalités ? on a ça en stock.</span></h2>
			<p class="wall">
				Mélangez des pages <strong>pré-rendues</strong> pour une perfomance optimale avec du
				<strong>rendu dynamique sur le serveur</strong>
				pour une flexibilité maximale. Transformez votre application en une
				<strong>PWA</strong> rendue côté client avec une seule ligne de code, pour toute votre
				application ou seulement une seule page. Utilisez un <strong>routeur côté client</strong>
				accessible avec du <strong>préchargement</strong> automatique pour une navigation
				instantanée qui ne recharge pas entièrement votre page (ni vos analytiques, et toutes ces
				choses qui pèsent lourd). Protégez vos utilisateurs avec de la
				<strong>protection CSRF</strong>
				et une configuration
				<strong>Content Security Policy</strong> simple à utiliser. Gardez vos secrets bien gardés
				avec une gestion avancée des <strong>variables d'environnement</strong>. Gérez les erreurs
				proprement et <strong>efficacement</strong>. Chargez la donnée
				<strong>directement depuis votre base de données</strong>
				et connectez votre back-end à votre front-end avec des chargements de données
				<strong>typés</strong>
				et des <strong>actions de formulaire</strong> qui fonctionnent avec ou sans JavaScript.
				Faites <strong>co-exister</strong> d'autres frameworks utilisant du routing côté client sur
				la même page. Ajoutez des service workers pour le support <strong>hors ligne</strong>.
				Générez des pages <strong>compatibles AMP</strong> si vous en avez le besoin. Construisez
				des UI complexes à l'aide d'un système puissant de routes basé sur votre arborescence de
				fichiers Des layouts imbriqués ? Évidemment. Apprenez les <strong>standards du web</strong>
				qui fonctionnent dans tous les environnements. Utilisez <strong>Tailwind</strong> et
				<strong>Playwright</strong>
				et <strong>Vitest</strong> et <strong>Storybook</strong> et, bah, ce que vous voulez.
				Développez des <strong>librairies</strong> ou bien des applications.
				<strong>Déployez partout</strong> avec les adaptateurs.
			</p>

			<p>
				SvelteKit est le framework qui <strong>grandit avec vous</strong>, peu importe ce que vous
				construisez.
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
		text-align: justify;
	}

	h2 {
		float: right;
		width: 5.5em;
	}

	h2 span {
		display: block;
		text-align: right;
		width: 5em;
		margin: 0 0 0 auto;
	}

	.wall {
		margin: 0;
		font-size: var(--sk-text-xs);
	}

	p + p {
		margin-top: 1em;
	}

	p,
	strong {
		color: var(--sk-text-3);
	}

	@media (min-width: 600px) {
		h2 {
			margin-top: 0.5em;
			width: 10em;
		}

		h2 span {
			width: auto;
		}

		/* TODO remove the 62.5% hack so we can use rems in media queries */
		.container {
			--size: 40rem;
			display: block;
		}

		.features {
			padding: 2rem 0 2rem calc(0 * var(--size));
		}
	}

	@media (min-width: 900px) {
		.container {
			--size: 45rem;
		}

		h2 {
			margin-top: 0.1em;
		}

		p {
			font-size: var(--sk-text-s);
		}

		.features {
			padding-top: clamp(0px, calc(23.333vw - 210px), 70px);
		}
	}
</style>
