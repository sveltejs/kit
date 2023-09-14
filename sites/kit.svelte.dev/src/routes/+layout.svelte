<script>
	import '@sveltejs/site-kit/styles/index.css';

	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { PUBLIC_LEARN_SITE_URL, PUBLIC_SVELTE_SITE_URL } from '$env/static/public';
	import { Banners, Icon, Shell } from '@sveltejs/site-kit/components';
	import { Nav, Separator } from '@sveltejs/site-kit/nav';
	import { Search, SearchBox } from '@sveltejs/site-kit/search';

	export let data;

	/** @type {import('@sveltejs/kit').Snapshot<number>} */
	let shell_snapshot;

	/** @type {import('@sveltejs/kit').Snapshot<{shell: number}>} */
	export const snapshot = {
		capture() {
			return {
				shell: shell_snapshot?.capture()
			};
		},
		restore(data) {
			shell_snapshot?.restore(data.shell);
		}
	};
</script>

<div style:display={$page.url.pathname !== '/docs' ? 'contents' : 'none'}>
	<Shell nav_visible={$page.url.pathname !== '/repl/embed'} bind:snapshot={shell_snapshot}>
		<Nav slot="top-nav" title={data.nav_title} links={data.nav_links}>
			<svelte:fragment slot="theme-label">Thème</svelte:fragment>
			<svelte:fragment slot="home-large">
				<strong>kit</strong>.svelte.dev
			</svelte:fragment>

			<svelte:fragment slot="home-small">
				<strong>kit</strong>
			</svelte:fragment>

			<svelte:fragment slot="search">
				{#if $page.url.pathname !== '/search'}
					<Search label="Recherche" />
				{/if}
			</svelte:fragment>

			<svelte:fragment slot="external-links">
				<a href="{PUBLIC_LEARN_SITE_URL}/tutorial/introducing-sveltekit" rel="external">Tutoriel</a>
				<a href={PUBLIC_SVELTE_SITE_URL}>Svelte</a>

				<Separator />

				<a href="{PUBLIC_SVELTE_SITE_URL}/chat" rel="external" title="Discord Chat">
					<span class="small">Discord</span>
					<span class="large"><Icon name="discord" /></span>
				</a>

				<a href="https://github.com/sveltejs/kit" title="GitHub Repo">
					<span class="small">GitHub</span>
					<span class="large"><Icon name="github" /></span>
				</a>
			</svelte:fragment>
		</Nav>

		<slot />

		<Banners slot="banner-bottom" data={data.banner} />
	</Shell>
</div>

{#if browser}
	<SearchBox placeholder="Recherche">
		<svelte:fragment slot="search-description">
			Les résultats se mettent à jour quand vous écrivez
		</svelte:fragment>
		<svelte:fragment slot="idle" let:has_recent_searches>
			{has_recent_searches ? 'Recherches récentes' : 'Aucune recherche récente'}
		</svelte:fragment>
		<svelte:fragment slot="no-results">Aucun résultat</svelte:fragment>
	</SearchBox>
{/if}

<style>
	.small {
		display: inline;
	}

	.large {
		display: none;
	}

	@media (min-width: 800px) {
		.small {
			display: none;
		}

		.large {
			display: inline;
		}
	}

	:global(.examples-container, .repl-outer, .tutorial-outer) {
		height: calc(100vh - var(--sk-nav-height)) !important;
	}

	:global(.toggle) {
		bottom: 0 !important;
	}

	:global(.text .vo a) {
		color: var(--sk-text-1);
		box-shadow: inset 0 -1px 0 0 var(--sk-text-4);
		transition: color 0.2s ease-in-out;
	}

	:global(.text .vo a:hover) {
		color: var(--sk-text-3);
	}
</style>
