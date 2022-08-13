<script>
	import VSCode from './vscode.png';
</script>

<div class="flex-container">

	<div class="flex-child text">
		<h3>TypeScript and IDE support</h3>
		Type definitions for all APIs for first-class TypeScript support. And an official <a href="https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode">VS Code extension</a> and <a href="https://sveltesociety.dev/tools#editor-support">community support for numerous other editors</a> like Emacs, Vim, and Sublime Text.
	</div>

	<div class="flex-child">
		<img src={VSCode} alt="Speedy page loads" />
	</div>

</div>

<style>
	.flex-container {
		display: flex;
	}

	.flex-child {
		flex: 1;
	}

	.text {
		margin: 50px 20px 0 0;
	}

	h3 {
		margin-bottom: 0.8rem;
	}
</style>
