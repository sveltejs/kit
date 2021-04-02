<script context="module">
	export const prerender = true;

	export async function load({ fetch }) {
		const res = await fetch('/blog.json');
		return {
			props: {
				posts: await res.json()
			}
		};
	}
</script>

<script>
	export let posts;
</script>

<svelte:head>
	<title>Blog</title>
</svelte:head>

<h1>blog</h1>

<ul>
	{#each posts as post}
		<li><a href="/blog/{post.slug}">{post.title}</a></li>
	{/each}
</ul>

<style>
	ul {
		padding: 0;
		margin: 0;
	}

	li {
		list-style: none;
	}

	a {
		display: block;
		padding: 0.5em 0;
		border-bottom: 1px solid #999;
	}
</style>
