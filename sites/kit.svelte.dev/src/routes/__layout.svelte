<script>
	import '@sveltejs/site-kit/base.css';
	import { browser } from '$app/env';
	import { page, navigating } from '$app/stores';
	import { Icon, Icons, Nav, NavItem, PreloadingIndicator, SkipLink } from '@sveltejs/site-kit';
	import Search from '$lib/search/Search.svelte';
	import SearchBox from '$lib/search/SearchBox.svelte';

	let h = 0;
	let w = 0;
	$: browser && document.documentElement.style.setProperty('--ukr-footer-height', `${h}px`);
</script>

<Icons />

{#if $navigating}
	<PreloadingIndicator />
{/if}

<SkipLink href="#main" />
<Nav {page} logo="/stopwar.svg">
	<svelte:fragment slot="nav-center">
		{#if browser}
			<!-- the <Nav> component renders this content inside a <ul>, so
				 we need to wrap it in an <li>. TODO if we adopt this design
				 on other sites, change <Nav> so we don't need to do this -->
			<li><Search /></li>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="nav-right">
		<NavItem href="/docs">Docs</NavItem>
		<NavItem href="/faq">FAQ</NavItem>

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
	<a target="_blank" rel="noopener noreferrer" href="https://www.stopputin.net/"
		><div class="ukr" bind:clientHeight={h} bind:clientWidth={w}>
			{#if w < 830}
				<strong>We stand with Ukraine.</strong>
				Donate →
			{:else}
				<strong>We stand with Ukraine.</strong>
				Petition your leaders. Show your support.
			{/if}
		</div></a
	>

<main id="main" style="padding-bottom: {h}px;">
	<slot />

	{#if browser}
		<SearchBox />
	{/if}
</main>

<style>
	main {
		position: relative;
		margin: 0 auto;
		padding-top: var(--nav-h);
		overflow: scroll;
		overflow-x: hidden;
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

	/* this is an unfortunate hack, but necessary to temporarily avoid
	   breaking changes to site-kit */
	:global(ul.external) {
		width: 40rem !important;
	}

	@media (min-width: 960px) {
		:global(ul.external) {
			width: 30rem !important;
		}
	}

	:global(body) {
		font-size: 1.6rem !important;
	}

	.ukr {
		background-color: #0066cc;
		color: white;
		position: fixed;
		bottom: 0;
		width: 100vw;
		text-align: center;
		padding: 0.75em;
		z-index: 999;
	}
	:global(.examples-container, .repl-outer, .tutorial-outer) {
		height: calc(100vh - var(--nav-h) - var(--ukr-footer-height)) !important;
	}
	:global(.toggle) {
		bottom: var(--ukr-footer-height) !important;
	}
	@media (max-width: 830px) {
		:global(aside) {
			z-index: 9999 !important;
		}
	}
	.ukr strong {
		color: #ffcc00;
	}
</style>
