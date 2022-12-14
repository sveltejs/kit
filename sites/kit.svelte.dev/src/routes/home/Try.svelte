<script>
	import Section from '@sveltejs/site-kit/components/Section.svelte';
</script>

<Section --background="var(--background-2)">
	<div class="grid" style="--columns: 2">
		<h2>
			<svg viewBox="0 0 24 24">
				<path
					d="M6 11.9958H18"
					stroke="white"
					fill="none"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					d="M12 18L6 12L12 6"
					stroke="white"
					fill="none"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>

			see for yourself
		</h2>
		<div class="try">
			<div class="terminal">
				<div class="chrome">
					<span class="red dot" />
					<span class="yellow dot" />
					<span class="green dot" />
					<span class="title">terminal</span>
				</div>
				<pre><code
						><span class="line"
							>npm create <span class="orange-highlight">svelte</span> my-app</span
						>
<span class="line">cd my-app</span>
<span class="line">npm install</span>
<span class="line">npm run dev -- --open</span></code
					></pre>
			</div>
		</div>
	</div>
	<p class="create-an-app">
		...or
		<a target="_blank" rel="noreferrer" href="https://sveltekit.new"> create an app </a>
		on StackBlitz.
	</p>
</Section>

<style>
	.grid *::selection {
		background: hsl(15, 100%, 65%);
		color: white;
	}

	.try {
		width: 100%;
		margin: 0 auto;
		font-size: var(--sk-text-m);
		color: white;
	}

	.terminal {
		background: rgba(0, 0, 0, 0.7);
		margin: 0;
		border-radius: var(--sk-border-radius);
		overflow: hidden;
	}

	.terminal .chrome {
		position: relative;
		background: var(--sk-back-3);
		color: var(--sk-text-3);
		display: flex;
		align-items: center;
		font-size: var(--sk-text-s);
		padding: 1rem;
		gap: 1rem;
	}

	.terminal .dot {
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
	}

	.red {
		background-color: hsl(15, 100%, 65%);
	}

	.yellow {
		background-color: hsl(48, 100%, 67%);
	}

	.green {
		background-color: hsl(141, 53%, 53%);
	}

	.title {
		position: absolute;
		display: flex;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
		align-items: center;
		justify-content: center;
	}

	.terminal pre {
		padding: 1em;
		font-size: var(--sk-text-xs);
	}

	.line::before {
		content: '$ ';
		opacity: 0.3;
	}

	h2 {
		color: white;
		font-size: var(--sk-text-xl);
	}

	svg {
		width: 1em;
		margin: 0 0.5em 0 0;
		display: none;
	}

	pre code {
		color: white;
		font-size: 1em;
	}

	.orange-highlight {
		color: hsl(15, 100%, 65%);
	}

	.create-an-app {
		color: white;
	}

	a {
		color: inherit;
		text-decoration: underline;
	}

	@media (min-width: 440px) {
		.terminal pre {
			font-size: var(--sk-text-s);
		}
	}

	@media (min-width: 1080px) {
		.terminal pre {
			font-size: var(--sk-text-m);
		}
	}

	@media (min-width: 900px) {
		svg {
			display: initial;
		}
		h2 {
			order: 2;
			font-size: var(--sk-text-xxl);
			display: flex;
			align-items: center;
		}
	}
</style>
