<script context="module">
	export const prerender = true;

	export async function load({ page, fetch }) {
		const res = await fetch(`/blog/${page.params.slug}.json`);
		return {
			props: {
				post: await res.json()
			}
		};
	}
</script>

<script>
	export let post;
</script>

<h1>{post.title}</h1>
<div class="post">
	{@html post.body}
</div>