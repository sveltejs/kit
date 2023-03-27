<script>
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import Search from '@sveltejs/site-kit/search/Search.svelte';
	import Icon from '@sveltejs/site-kit/components/Icon.svelte';
	import Nav from '@sveltejs/site-kit/components/Nav.svelte';
	import NavItem from '@sveltejs/site-kit/components/NavItem.svelte';
	import Separator from '@sveltejs/site-kit/components/Separator.svelte';
	import Shell from '@sveltejs/site-kit/components/Shell.svelte';
	import '@sveltejs/site-kit/styles/index.css';
	import Logo from './home/svelte-logo.svg';

	let banner_height = '48px';
</script>

<Shell banner_bottom_height={banner_height}>
	<Nav logo={Logo} slot="top-nav">
		<svelte:fragment slot="nav-center">
			{#if $page.url.pathname !== '/search'}
				<!-- the <Nav> component renders this content inside a <ul>, so
				we need to wrap it in an <li>. TODO if we adopt this design
				on other sites, change <Nav> so we don't need to do this -->
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

	<div class="banner" slot="banner-bottom">
		<a target="_blank" rel="noopener noreferrer" href="https://hack.sveltesociety.dev/">
			<span class="small">
				<strong>Announcing SvelteHack</strong> Participate →
			</span>
			<span class="large">
				<strong>Announcing SvelteHack</strong> Our first hackathon with over $12,000 in prizes →
			</span>
		</a>
		<button on:click={() => (banner_height = '0px')}> ✕ </button>
	</div>
</Shell>

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

	.banner {
		--banner-bg: #ff4700;
		--banner-color: white;
		--banner-strong-color: white;

		background-color: var(--banner-bg);
		color: var(--banner-color);
		position: fixed;
		display: flex;
		align-items: center;
		justify-content: center;
		bottom: 0;
		width: 100vw;
		height: var(--sk-banner-bottom-height);
		z-index: 999;
	}

	.banner strong {
		font-weight: bold;
	}

	.banner span {
		color: var(--banner-color);
	}

	.banner button {
		position: absolute;
		right: 30px;
		font-size: 18px;
	}
</style>
