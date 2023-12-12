<script>
	import '@sveltejs/site-kit/styles/index.css';

	import { browser } from '$app/environment';
	import { page } from '$app/stores';
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
			<svelte:fragment slot="home-large">
				<strong>kit</strong>.svelte.dev
			</svelte:fragment>

			<svelte:fragment slot="home-small">
				<strong>kit</strong>
			</svelte:fragment>

			<svelte:fragment slot="search">
				{#if $page.url.pathname !== '/search'}
					<Search />
				{/if}
			</svelte:fragment>

			<svelte:fragment slot="external-links">
				<a href="https://learn.svelte.dev/tutorial/introducing-sveltekit" rel="external">Tutorial</a
				>
				<a href="https://svelte.dev">Svelte</a>

				<Separator />

				<a href="https://svelte.dev/chat" rel="external" title="Discord Chat">
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
	<SearchBox />
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
</style>
