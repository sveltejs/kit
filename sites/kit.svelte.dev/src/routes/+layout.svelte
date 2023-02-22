<script>
	import '@sveltejs/site-kit/styles/index.css';
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { page, navigating } from '$app/stores';
	import Icon from '@sveltejs/site-kit/components/Icon.svelte';
	import Icons from '@sveltejs/site-kit/components/Icons.svelte';
	import Nav from '@sveltejs/site-kit/components/Nav.svelte';
	import NavItem from '@sveltejs/site-kit/components/NavItem.svelte';
	import PreloadingIndicator from '@sveltejs/site-kit/components/PreloadingIndicator.svelte';
	import SkipLink from '@sveltejs/site-kit/components/SkipLink.svelte';
	import Search from '$lib/search/Search.svelte';
	import SearchBox from '$lib/search/SearchBox.svelte';
	import Logo from './home/svelte-logo.svg';

	let show_banner = false;
</script>

<Icons />

{#if $navigating}
	<PreloadingIndicator />
{/if}

<SkipLink href="#main" />

<Nav {page} logo={Logo}>
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
		<NavItem selected={$page.url.pathname.startsWith(`${base}/faq`) || undefined} href="{base}/faq"
			>FAQ</NavItem
		>

		<li aria-hidden="true"><span class="separator" /></li>

		<NavItem external="https://svelte.dev">Svelte</NavItem>

		<NavItem external="https://svelte.dev/chat" title="Discord Chat">
			<span class="small">Discord</span>
			<span class="large"><Icon name="message-square" /></span>
		</NavItem>

		<NavItem external="https://github.com/sveltejs/kit" title="GitHub Repo">
			<span class="small">GitHub</span>
			<span class="large"><Icon name="github" /></span>
		</NavItem>
	</svelte:fragment>
</Nav>

<main id="main">
	<slot />
</main>

{#if !show_banner}
	<div class="banner">
		<a target="_blank" rel="noopener noreferrer" href="https://hack.sveltesociety.dev/">
			<span class="small">
				<strong>Announcing SvelteHack</strong> Participate →
			</span>
			<span class="large">
				<strong>Announcing SvelteHack</strong> Participate in our first hackathon and win →
			</span>
		</a>
		<button on:click={() => (show_banner = !show_banner)}> ✕ </button>
	</div>
{/if}

{#if browser}
	<SearchBox />
{/if}

<style>
	:root {
		--banner-footer-height: 48px;
	}

	main {
		position: relative;
		margin: 0 auto;
		padding-top: var(--sk-nav-height);
		padding-bottom: var(--banner-footer-height);
		overflow: hidden;
	}

	.small {
		display: inline;
	}

	.large {
		display: none;
	}

	/* duplicating content from <Nav> — bit hacky but will do for now */
	.separator {
		display: block;
		position: relative;
		height: 1px;
		margin: 0.5rem 0;
		background: radial-gradient(circle at center, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.05));
	}

	@media (min-width: 800px) {
		.small {
			display: none;
		}

		.large {
			display: inline;
		}

		.separator {
			display: flex;
			align-items: center;
			justify-content: center;
			background: none;
			height: 100%;
			margin: 0;
			border: none;
			text-align: center;
		}

		.separator::before {
			content: '•';
			margin: 0 0.3rem;
			color: #ccc;
		}
	}

	@media (min-width: 960px) {
		/* this is an unfortunate hack, but necessary to temporarily avoid
		breaking changes to site-kit */
		:global(ul.external) {
			width: 30rem !important;
		}
	}

	:global(body) {
		font-size: 1.6rem !important;
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

	@media (max-width: 830px) {
		:global(aside) {
			z-index: 9999 !important;
		}
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
		height: var(--banner-footer-height);
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
