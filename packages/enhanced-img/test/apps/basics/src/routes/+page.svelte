<script>
	import logo from './logo.png?enhanced';
</script>

<!-- standard image -->
<enhanced:img id="birds" src="./birds.jpg" alt="birds" />

<!-- svg over inline size -->
<enhanced:img id="playwright" src="./playwright-logo.svg" alt="Playwright logo" />

<!-- dynamic image -->
<enhanced:img id="logo" src={logo} alt="Svelte logo" />
