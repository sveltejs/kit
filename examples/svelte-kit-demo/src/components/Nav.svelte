<script>
	export let path;
</script>

<nav>
	<a href="/" sveltekit:prefetch class:active={path === '/'}>home</a>
	<a href="/about" sveltekit:prefetch class:active={path === '/about'}>about</a>
	<a href="/blog" sveltekit:prefetch class:active={path === '/blog'}>blog</a>
</nav>

<style>
	nav {
		border-bottom: 1px solid black;
		padding: 0 0 1em 0;
		margin: 0 0 1em 0;
	}

	nav::after {
		content: '';
		display: table;
		clear: both;
	}

	a {
		display: block;
		float: left;
		color: rgba(0,0,0,0.4);
		margin: 0 1em 0 0;
		text-decoration: none;
	}

	a + a::before {
		content: '•';
		color: rgba(0,0,0,0.4);
		margin: 0 1em 0 0;
	}

	.active {
		color: rgba(0,0,0,0.9);
	}
</style>