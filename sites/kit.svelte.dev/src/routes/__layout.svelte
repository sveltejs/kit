<script>
	import '@sveltejs/site-kit/base.css';
	import { page, navigating } from '$app/stores';
	import { Icon, Icons, Nav, NavItem, PreloadingIndicator, SkipLink } from '@sveltejs/site-kit';
</script>

<Icons />

{#if $navigating}
	<PreloadingIndicator />
{/if}

<SkipLink href="#main" />
<Nav {page} logo="/images/svelte-kit-horizontal.svg">
	<svelte:fragment slot="nav-center">
		<NavItem href="/docs">Docs</NavItem>
		<NavItem href="/faq">FAQ</NavItem>
		<NavItem href="/migrating">Migrating</NavItem>
	</svelte:fragment>

	<svelte:fragment slot="nav-right">
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

<style>
	main {
		position: relative;
		margin-inline: auto;
		margin-block: 0;
		padding-block-start: var(--nav-h);
		overflow-x: hidden;
	}

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
</style>
