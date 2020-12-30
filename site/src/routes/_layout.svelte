<script>
	import { stores } from '@sapper/app';
	import { Icons, Icon, Nav, NavItem } from '@sveltejs/site-kit';

	export let segment;

	const { page } = stores();
</script>

<style>
	:global(html) {
		--prime: rgb(21, 151, 148) !important; /* TODO remove .theme-default from shared, so we don't need !important */
	}

	main {
		position: relative;
		margin: 0 auto;
		/* padding: var(--nav-h) var(--side-nav) 0 var(--side-nav); */
		padding: var(--nav-h) 0 0 0;
		overflow-x: hidden;
	}
</style>

<Icons/>

<Nav {segment} {page} logo="sapper-logo-horizontal.svg">
	<NavItem segment="docs">Docs</NavItem>
	<NavItem segment="faq">FAQ</NavItem>

	<NavItem external="https://svelte.dev">Svelte</NavItem>

	<NavItem external="https://svelte.dev/chat" title="Discord Chat">
		<Icon name="message-square"/>
	</NavItem>

	<NavItem external="https://github.com/sveltejs/sapper" title="GitHub Repo">
		<Icon name="github"/>
	</NavItem>
</Nav>

<main>
	<slot></slot>
</main>
