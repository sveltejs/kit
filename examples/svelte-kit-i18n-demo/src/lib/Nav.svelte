<script>
	import { page, i18n } from '$app/stores';
	import { l } from '$app/translations';

	$: path = $page.path;
</script>

<nav>
	<div class="main">
		<a href={$l('/')} sveltekit:prefetch class:active={path === $l('/')}>home</a>
		<a href={$l('/about')} sveltekit:prefetch class:active={path === $l('/about')}>about</a>
		<a
			href={$l('/about/[123]/customer/[test]')}
			sveltekit:prefetch
			class:active={path === $l('/about/[123]/customer/[test]')}>param</a
		>
		<a href={$l('/blog')} sveltekit:prefetch class:active={path === $l('/blog')}>blog</a>
	</div>
	{#if $i18n.locales}
		<div class="lang">
			{#each $i18n.locales as { code }}
				<a
					href={$i18n.localizedPaths?.[code]}
					rel="external"
					class:active={code === $i18n.locale?.code}>{code}</a
				>
			{/each}
		</div>
	{/if}
</nav>

<style>
	nav {
		border-bottom: 1px solid black;
		padding: 0 0 1em 0;
		margin: 0 0 1em 0;
		display: flex;
	}

	nav::after {
		content: '';
		display: table;
		clear: both;
	}

	a {
		display: block;
		float: left;
		color: rgba(0, 0, 0, 0.4);
		margin: 0 1em 0 0;
		text-decoration: none;
	}

	a + a::before {
		content: '•';
		color: rgba(0, 0, 0, 0.4);
		margin: 0 1em 0 0;
	}

	.active {
		color: rgba(0, 0, 0, 0.9);
	}

	.main {
		flex-grow: 1;
	}
</style>
