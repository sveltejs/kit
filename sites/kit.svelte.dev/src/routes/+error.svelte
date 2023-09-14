<script>
	import { page } from '$app/stores';
	import { PUBLIC_SVELTE_SITE_URL, PUBLIC_GITHUB_ORG } from '$env/static/public';

	// we don't want to use <svelte:window bind:online> here, because we only care about the online
	// state when the page first loads
	let online = typeof navigator !== 'undefined' ? navigator.onLine : true;
</script>

<svelte:head>
	<title>{$page.status}</title>
</svelte:head>

<div class="container">
	{#if $page.status === 404}
		<h1>Non trouvé !</h1>
	{:else if online}
		<h1>Beurk !</h1>

		{#if $page.error.message}
			<p class="error">{$page.status}: {$page.error.message}</p>
		{/if}

		<p>Merci d'essayer de recharger la page.</p>

		<p>
			Si l'erreur persiste, merci de vous rendre sur le <a href="{PUBLIC_SVELTE_SITE_URL}/chat"
				>forum Discord</a
			>
			et de nous remonter le problème, ou ouvrez une issue sur
			<a href="https://github.com/{PUBLIC_GITHUB_ORG}/kit">GitHub</a>. Merci !
		</p>
	{:else}
		<h1>Il semblerait que vous soyez hors ligne</h1>

		<p>Rechargez la page une fois que vous aurez retrouvé internet.</p>
	{/if}
</div>

<style>
	.container {
		padding: var(--sk-page-padding-top) var(--sk-page-padding-side) 6rem var(--sk-page-padding-side);
	}

	h1,
	p {
		margin: 0 auto;
	}

	h1 {
		font-size: 2.8em;
		font-weight: 300;
		margin: 0;
		margin-bottom: 0.5em;
	}

	p {
		margin: 1em auto;
	}

	.error {
		background-color: #da106e;
		color: white;
		padding: 12px 16px;
		font: 600 16px/1.7 var(--sk-font);
		border-radius: 2px;
	}
</style>
