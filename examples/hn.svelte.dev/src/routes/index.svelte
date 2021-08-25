<!--
<script context="module">
	import {dev} from '$app/env';
	export function load() {
		return { redirect: '/top/1', status: dev ? 302 : 301 };
	}
</script>
-->
<svelte:head>
	<title>Home • Svelte Hacker News</title>
</svelte:head>

<h1>Home</h1>

<p>This is a simple Hacker News clone, built with <a href="https://kit.svelte.dev">SvelteKit</a>, an application framework for <a href="https://svelte.dev">Svelte</a>.</p>

<p>Svelte is a new kind of framework, one that compiles your component templates into fast, compact JavaScript — either client-side or server-side. You can read more about the design and philosophy in the <a href="https://svelte.dev/blog/svelte-3-rethinking-reactivity">introductory blog post</a>.</p>

<p>We're using <a href="https://github.com/davideast/hnpwa-api">hnpwa-api</a> as a backend. The app is hosted on <a href="https://cloud.google.com/run/">Cloud Run</a>, using <a href="https://www.cloudflare.com/">Cloudflare</a> for the CDN. <a href="https://github.com/sveltejs/hn.svelte.dev">The source code is here</a>.</p>
