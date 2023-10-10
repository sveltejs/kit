<script>
	import { Blurb } from '@sveltejs/site-kit/home';
</script>

<Blurb --background="var(--sk-back-1)">
	<div slot="one">
		<h2>fast</h2>
		<p>
			Powered by <a target="_blank" rel="noreferrer" href="https://svelte.dev">Svelte</a> and
			<a target="_blank" rel="noreferrer" href="https://vitejs.dev">Vite</a>, speed is baked into
			every crevice: fast setup, fast dev, fast builds, fast page loads, fast navigation. Did we
			mention it's fast?
		</p>
	</div>

	<div slot="two">
		<h2>fun</h2>
		<p>
			No more wasted days figuring out bundler configuration, routing, SSR, CSP, TypeScript,
			deployment settings and all the other boring stuff. Code with joy.
		</p>
	</div>

	<div slot="three">
		<h2>flexible</h2>
		<p>
			SPA? MPA? SSR? SSG? Check. SvelteKit gives you the tools to succeed whatever it is you're
			building. And it runs wherever JavaScript does.
		</p>
	</div>
</Blurb>

<style>
	p {
		font-size: var(--sk-text-m);
	}
</style>
