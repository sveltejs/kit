<script>
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { Icon, Nav, NavItem, Separator, Shell } from '@sveltejs/site-kit/components';
	import { Search, SearchBox } from '@sveltejs/site-kit/search';
	import '@sveltejs/site-kit/styles/index.css';
</script>

<Shell>
	<Nav slot="top-nav">
		<svelte:fragment slot="home">
			<span><strong>kit</strong>.svelte.dev</span>
		</svelte:fragment>

		<svelte:fragment slot="nav-center">
			{#if $page.url.pathname !== '/search'}
				<li><Search /></li>
			{/if}
		</svelte:fragment>

		<svelte:fragment slot="nav-right">
			<NavItem
				selected={$page.url.pathname.startsWith(`${base}/docs`) || undefined}
				href="{base}/docs">Docs</NavItem
			>
			<NavItem
				selected={$page.url.pathname.startsWith(`${base}/faq`) || undefined}
				href="{base}/faq">FAQ</NavItem
			>

			<Separator />

			<NavItem external="https://svelte.dev">Svelte</NavItem>

			<NavItem external="https://svelte.dev/chat" title="Discord Chat">
				<span slot="small">Discord</span>
				<Icon name="message-square" />
			</NavItem>

			<NavItem external="https://github.com/sveltejs/kit" title="GitHub Repo">
				<span slot="small">GitHub</span>
				<Icon name="github" />
			</NavItem>
		</svelte:fragment>
	</Nav>

	<slot />
</Shell>

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

	li {
		display: flex;
		align-items: center;
	}

	:global(.examples-container, .repl-outer, .tutorial-outer) {
		height: calc(100vh - var(--sk-nav-height)) !important;
	}

	:global(.toggle) {
		bottom: 0 !important;
	}
</style>
