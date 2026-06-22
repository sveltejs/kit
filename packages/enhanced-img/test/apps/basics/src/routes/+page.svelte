<script>
	import logo from './logo.png?enhanced';

	// see https://github.com/sveltejs/kit/issues/15616
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const rawImports = import.meta.glob('./image.svelte', { eager: true, query: '?raw' });
</script>

<!-- standard image -->
<enhanced:img id="birds" src="./birds.jpg" alt="birds" />

<!-- svg over inline size -->
<enhanced:img id="playwright" src="./playwright-logo.svg" alt="Playwright logo" />

<!-- dynamic image -->
<enhanced:img id="logo" src={logo} alt="Svelte logo" />
