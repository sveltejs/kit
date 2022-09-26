<script>
	import '$lib/styles/theme-dark.css';
	import '@sveltejs/site-kit/base.css';
	import { browser } from '$app/environment';
	import { page, navigating } from '$app/stores';
	import { Icon, Icons, Nav, NavItem, PreloadingIndicator, SkipLink } from '@sveltejs/site-kit';
	import Search from '$lib/search/Search.svelte';
	import SearchBox from '$lib/search/SearchBox.svelte';
	import StopWar from './stopwar.svg';
	import { onMount } from 'svelte';

	let currentTheme = 'theme-default';

	function getCurrentTheme() {
		if (browser) {
			const theme = localStorage.getItem('theme');
			if (!theme) {
				const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
				if (prefersDarkMode) {
					localStorage.setItem('theme', 'theme-dark');
					return 'theme-dark';
				}
			}
			return theme;
		}
		return 'theme-default';
	}

	function setTheme(theme) {
		document.documentElement.classList.remove('theme-default', 'theme-dark');
		document.documentElement.classList.add(theme);
		localStorage.setItem('theme', theme);
		currentTheme = theme;
	}

	function toggleTheme () {
		let theme = currentTheme === 'theme-default' ? 'theme-dark' : 'theme-default';
		setTheme(theme);
	}

	onMount(() => {
		currentTheme = getCurrentTheme();
		setTheme(currentTheme);
	});
</script>

<Icons />

{#if $navigating}
	<PreloadingIndicator />
{/if}

<SkipLink href="#main" />
<Nav {page} logo={StopWar}>
	<svelte:fragment slot="nav-center">
		{#if $page.url.pathname !== '/search'}
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

		<li aria-hidden="true"><span class="separator" /></li>

		<NavItem title="Dark Mode toggle">
			<span on:click={toggleTheme}>
			{#if currentTheme === 'theme-default'}
				<span class="small">Dark mode</span>
				<span class="large">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						class="icon"
					>
							<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
				</span>
			{:else}
				<span class="small">Light mode</span>
				<span class="large">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						class="icon"
					>
						<circle cx="12" cy="12" r="5" />
						<line x1="12" y1="1" x2="12" y2="3" />
						<line x1="12" y1="21" x2="12" y2="23" />
						<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
						<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
						<line x1="1" y1="12" x2="3" y2="12" />
						<line x1="21" y1="12" x2="23" y2="12" />
						<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
						<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
					</svg>
				</span>
			{/if}
		</span>
		</NavItem>
	</svelte:fragment>
</Nav>

<main id="main">
	<slot />

	{#if browser}
		<SearchBox />
	{/if}
</main>

<a target="_blank" rel="noopener noreferrer" href="https://www.stopputin.net/">
	<div class="ukr">
		<span class="small">
			<strong>We stand with Ukraine.</strong> Donate →
		</span>
		<span class="large">
			<strong>We stand with Ukraine.</strong> Petition your leaders. Show your support.
		</span>
	</div>
</a>

<style>
	main {
		position: relative;
		margin: 0 auto;
		padding-top: var(--nav-h);
		overflow: auto;
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

	/** Ukraine banner */
	:root {
		--ukr-footer-height: 48px;
	}

	main {
		padding-bottom: var(--ukr-footer-height);
	}

	.ukr {
		background-color: #0066cc;
		color: white;
		position: fixed;
		display: flex;
		align-items: center;
		justify-content: center;
		bottom: 0;
		width: 100vw;
		height: var(--ukr-footer-height);
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

	:global(html.theme-dark nav) {
		background-color: var(--back) !important;
	}

	:global(body) {
		transition: background-color 0.5s;
	}

	.icon {
		position: relative;
		overflow: hidden;
		vertical-align: middle;
		-o-object-fit: contain;
		object-fit: contain;
		-webkit-transform-origin: center center;
		transform-origin: center center;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
		fill: none;
	}
</style>
