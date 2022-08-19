<script>
	import VSCode from './vscode.png';
</script>

<div class="container">

	<div class="text">
		<h3>TypeScript and<br/>IDE support</h3>
		Type definitions for all APIs for first-class TypeScript support. And an official <a href="https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode">VS Code extension</a> and <a href="https://sveltesociety.dev/tools#editor-support">community support for numerous other editors</a> like Emacs, Vim, and Sublime Text.
	</div>

	<div>
		<img src={VSCode} alt="Speedy page loads" />
	</div>

</div>

<style>
	.container {
		display: grid;
		grid-template-columns: repeat(1, minmax(0, 1fr));
		gap: 20px;
	}

	.text {
		margin-top: 50px;
	}

	h3 {
		margin-bottom: 0.8rem;
	}

	img {
		width: 100%;
		max-width: 654px;
		height: auto;
	}

	@media (min-width: 1024px) {
		.container {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
