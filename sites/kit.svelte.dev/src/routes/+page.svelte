<script>
	import Features from './home/Features.svelte';
	import Hero from './home/Hero.svelte';
	import Showcase from './home/Showcase.svelte';
	import Try from './home/Try.svelte';
	import Deployment from './home/Deployment.svelte';
	import Svelte from './home/Svelte.svelte';
	import Intro from './home/Intro.svelte';
	import './home/common.css';
</script>

<svelte:head>
	<title>SvelteKit • Web development, streamlined</title>

	<meta name="twitter:title" content="SvelteKit" />
	<meta name="twitter:description" content="Web development, streamlined" />
	<meta name="description" content="SvelteKit is the official Svelte application framework" />

	<meta property="og:type" content="website" />
	<meta property="og:title" content="SvelteKit • Web development, streamlined" />
	<meta property="og:description" content="SvelteKit is the official Svelte application framework" />
	<meta property="og:url" content="https://kit.svelte.dev/" />
	<meta property="og:image" content="https://raw.githubusercontent.com/sveltejs/branding/master/svelte-logo.svg" />

	<script type="application/ld+json">
	{
		"@context": "http://schema.org",
		"@type": "SoftwareSourceCode",
		"name": "SvelteKit",
		"description": "SvelteKit is the official Svelte application framework.",
		"url": "https://kit.svelte.dev/",
		"codeRepository": "https://github.com/sveltejs/kit",
		"dateCreated": "2020-10-15T16:00:00",
		"programmingLanguage": [
			"JavaScript",
			"TypeScript"
		],
		"logo": "https://raw.githubusercontent.com/sveltejs/branding/master/svelte-logo.svg",
		"sameAs": [
			"https://github.com/sveltejs/kit",
			"https://www.npmjs.com/package/@sveltejs/kit"
		],
		"license": "https://github.com/sveltejs/kit/blob/master/LICENSE",
		"releasedEvent": {
			"@type": "PublicationEvent",
			"startDate": "2022-12-14T17:00:00",
			"url": [
				"https://svelte.dev/blog/announcing-sveltekit-1.0",
				"https://www.youtube.com/watch?v=N4BRVkQVoMc"
			]
		},
		"contributor": [{
			"@type": "Person",
			"name": "Rich Harris",
			"url": "https://www.rich-harris.co.uk",
			"image": "https://avatars.githubusercontent.com/u/1162160",
			"sameAs": [
				"https://github.com/Rich-Harris",
				"https://twitter.com/Rich_Harris"
			]	
		}, {
			"@type": "Person",
			"name": "Ben McCann",
			"url": "https://www.benmccann.com",
			"image": "https://avatars.githubusercontent.com/u/322311",
			"sameAs": [
				"https://github.com/benmccann",
				"https://twitter.com/benjaminmccann",
				"https://about.me/benmccann",
				"https://angel.co/ben-mccann",
				"https://www.crunchbase.com/person/benjamin-mccann",
				"https://www.linkedin.com/in/benmccann"
			]	
		}, {
			"@type": "Person",
			"name": "Simon Holthausen",
			"image": "https://avatars.githubusercontent.com/u/5968653",
			"sameAs": [
				"https://github.com/dummdidumm",
				"https://twitter.com/dummdidumm_"
			]	
		}, {
			"@type": "Person",
			"name": "Ignatius Bagus",
			"url": "https://mauss.dev/",
			"image": "https://avatars.githubusercontent.com/u/8156777",
			"sameAs": [
				"https://twitter.com/alchemauss",
				"https://github.com/ignatiusmb",
				"https://gitlab.com/ignatiusmb",
				"https://www.linkedin.com/in/ignatiusmb"
			]	
		}, {
			"@type": "Person",
			"name": "Conduitry",
			"url": "https://conduitry.dev/",
			"image": "https://avatars.githubusercontent.com/u/16696352",
			"sameAs": [
				"https://github.com/Conduitry"
			]	
		}, {
			"@type": "Person",
			"name": "Dominik Göpel",
			"url": "https://goepel.it/",
			"image": "https://avatars.githubusercontent.com/u/611613",
			"sameAs": [
				"https://github.com/dominikg"
			]	
		}, {
			"@type": "Person",
			"name": "Bjorn Lu",
			"url": "https://bjornlu.com/",
			"image": "https://avatars.githubusercontent.com/u/34116392",
			"sameAs": [
				"https://github.com/bluwy",
				"https://twitter.com/bluwyoo",
				"https://m.webtoo.ls/@bluwy",
				"https://www.linkedin.com/in/bjorn-lu-3302a31b5",
				"https://www.reddit.com/user/IamLUG"
			]	
		}]
	}
	</script>
</svelte:head>

<div class="home">
	<h1 class="visually-hidden">SvelteKit</h1>

	<Hero />
	<Intro />
	<Try />
	<Svelte />
	<Features />
	<Deployment />
	<Showcase />

	<footer>
		<p>
			SvelteKit is <a target="_blank" rel="noreferrer" href="https://github.com/sveltejs/kit"
				>free and open source software</a
			> released under the MIT license.
		</p>
	</footer>
</div>

<style>
	footer {
		padding: 1em var(--sk-page-padding-side);
		text-align: center;
		background: var(--sk-back-2);
	}

	footer p {
		max-width: 20em;
		margin: 0 auto;
	}

	footer p a {
		color: inherit;
		text-decoration: underline;
	}

	@media (min-width: 680px) {
		footer p {
			max-width: none;
		}
	}
</style>
