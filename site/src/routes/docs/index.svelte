<script context="module">
	export async function preload() {
		const sections = await this.fetch(`docs.json`).then(r => r.json());
		return { sections };
	}
</script>

<script>
	import { Docs } from '@sveltejs/site-kit'

	export let sections;
</script>

<svelte:head>
	<title>Docs • Sapper</title>

	<meta name="twitter:title" content="Sapper docs">
	<meta name="twitter:description" content="The next small thing in web development">
	<meta name="Description" content="The next small thing in web development">
</svelte:head>

<Docs {sections} project="sapper"/>
