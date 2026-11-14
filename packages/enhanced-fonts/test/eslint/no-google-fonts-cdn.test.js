import { rules } from '../../eslint/index.js';
import { app_html, svelte, tester } from './_rule-tester.js';

const PLAYGROUND_HOME = `<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-inter" preload />

<article class="prose">
	<p class="meta">Route <code>/</code> · Inter preloaded</p>
	<h1>The marmalade oration</h1>
</article>

<style>
	.prose {
		font-family: var(--font-inter);
	}
</style>
`;

const PLAYGROUND_DISPLAY = `<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-inter" />
<Font cssVariable="--font-display" />

<article class="prose">
	<p class="ticket">HELLO CRUMB WORLD</p>
</article>

<style>
	.prose {
		font-family: var(--font-inter);
	}

	.ticket {
		font-family: var(--font-display);
	}
</style>
`;

tester.run('no-google-fonts-cdn', rules['no-google-fonts-cdn'], {
	valid: [
		svelte(PLAYGROUND_HOME),
		svelte(PLAYGROUND_DISPLAY, 'src/routes/display/+page.svelte'),
		svelte(`<script>
	import Font from '@sveltejs/enhanced-fonts/Font.svelte';
</script>

<Font cssVariable="--font-inter" />

<style>
	@font-face {
		font-family: Inter;
		src: url('/fonts/inter.woff2') format('woff2');
	}

	:root {
		font-family: var(--font-inter);
	}
</style>
`),
		svelte(`<svelte:head>
	<link rel="preload" as="font" href="/_app/immutable/fonts/inter-400-normal.c9407645.woff2" type="font/woff2" crossorigin="anonymous" />
</svelte:head>
`),
		svelte(`<!-- leftover: https://fonts.googleapis.com/css2?family=Inter -->
<!--
<link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet" />
<link href="https://fonts.gstatic.com/s/inter/v13/x.woff2" rel="preload" as="font" />
-->
<p>See fonts.googleapis.com in this comment only.</p>
`),
		svelte(`<style>
	/* @import url('https://fonts.googleapis.com/css2?family=Inter'); */
	/* fonts.gstatic.com/s/inter/v13/x.woff2 */
	.prose {
		font-family: var(--font-inter);
	}
</style>
`),
		svelte(`<svelte:head>
	<link rel="stylesheet" href="https://fonts.bunny.net/css?family=inter:400" />
	<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400&display=swap" />
</svelte:head>
`),
		svelte(`<style>
	@import url('https://fonts.bunny.net/css?family=inter:400');
	@import url('https://api.fontshare.com/v2/css?f[]=satoshi@400');
</style>
`),
		app_html(`<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		%sveltekit.head%
	</head>
	<body>
		<div>%sveltekit.body%</div>
	</body>
</html>
`),
		svelte(`<p>Do not copy https://fonts.googleapis.com/css into production.</p>`),
		svelte(`<style>
	.hint::before {
		content: "@import url('https://fonts.googleapis.com/css2?family=Inter')";
	}
</style>
`)
	],
	invalid: [
		{
			...svelte(`<svelte:head>
	<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter&display=swap" />
</svelte:head>
`),
			errors: [{ messageId: 'googleCdn', data: { host: 'fonts.googleapis.com' } }]
		},
		{
			...svelte(`<svelte:head>
	<link rel="preload" as="font" href="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2" crossorigin />
</svelte:head>
`),
			errors: [{ messageId: 'googleCdn', data: { host: 'fonts.gstatic.com' } }]
		},
		{
			...svelte(`<style>
	@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
</style>
`),
			errors: [{ messageId: 'googleCdn', data: { host: 'fonts.googleapis.com' } }]
		},
		{
			...svelte(`<style>
	@import url("https://fonts.gstatic.com/s/inter/v13/x.woff2");
</style>
`),
			errors: [{ messageId: 'googleCdn', data: { host: 'fonts.gstatic.com' } }]
		},
		{
			...svelte(`<style>
	@import 'https://fonts.googleapis.com/css?family=Roboto';
</style>
`),
			errors: [{ messageId: 'googleCdn', data: { host: 'fonts.googleapis.com' } }]
		},
		{
			...svelte(`<style>
	@import /* font */ url('https://fonts.googleapis.com/css2?family=Inter');
</style>
`),
			errors: [{ messageId: 'googleCdn', data: { host: 'fonts.googleapis.com' } }]
		},
		{
			...svelte(`<svelte:head>
	<link href="//fonts.googleapis.com/css2?family=Inter" rel="stylesheet" />
	<link href="http://fonts.gstatic.com/s/inter/v13/x.woff2" rel="preload" as="font" />
</svelte:head>
`),
			errors: [
				{ messageId: 'googleCdn', data: { host: 'fonts.googleapis.com' } },
				{ messageId: 'googleCdn', data: { host: 'fonts.gstatic.com' } }
			]
		},
		{
			...app_html(`<!doctype html>
<html lang="en">
	<head>
		<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter&display=swap" />
		%sveltekit.head%
	</head>
	<body>
		<div>%sveltekit.body%</div>
	</body>
</html>
`),
			errors: [{ messageId: 'googleCdn', data: { host: 'fonts.googleapis.com' } }]
		},
		{
			...app_html(`<!doctype html>
<html lang="en">
	<head>
		<link rel="preload" as="font" href="https://fonts.gstatic.com/s/inter/v13/x.woff2" />
		<style>
			@import url('https://fonts.googleapis.com/css2?family=Roboto');
		</style>
		%sveltekit.head%
	</head>
	<body>
		<div>%sveltekit.body%</div>
	</body>
</html>
`),
			errors: [
				{ messageId: 'googleCdn', data: { host: 'fonts.gstatic.com' } },
				{ messageId: 'googleCdn', data: { host: 'fonts.googleapis.com' } }
			]
		}
	]
});
