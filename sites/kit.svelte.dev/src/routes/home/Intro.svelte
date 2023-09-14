<script>
	import { PUBLIC_SVELTE_SITE_URL } from '$env/static/public';
	import { Blurb } from '@sveltejs/site-kit/home';
</script>

<Blurb --background="var(--sk-back-1)">
	<div slot="one">
		<h2>rapide</h2>
		<p>
			Basé sur <a target="_blank" rel="noreferrer" href={PUBLIC_SVELTE_SITE_URL}>Svelte</a> et
			<a target="_blank" rel="noreferrer" href="https://vitejs.dev">Vite</a>, la vitesse est gravée
			dans chaque recoin : installation rapide, développement rapide, builds rapides, chargements de
			page rapides, navigation rapide. On a mentionné que c'était rapide ?
		</p>
	</div>

	<div slot="two">
		<h2>fun</h2>
		<p>
			Plus de journées perdues dans des galères de configuration de compilateur, de routing, SSR,
			CSP, TypeScript, paramètres de déploiement et tout autre sujet pénible. Codez avec le sourire.
		</p>
	</div>

	<div slot="three">
		<h2>flexible</h2>
		<p>
			SPA ? MPA ? SSR ? SSG ? Check. SvelteKit vous fournit les outils pour réussir quelque soit ce
			que vous construisez. Et ça fonctionne partout où JavaScript fonctionne.
		</p>
	</div>
</Blurb>

<style>
	p {
		font-size: var(--sk-text-m);
	}
</style>
