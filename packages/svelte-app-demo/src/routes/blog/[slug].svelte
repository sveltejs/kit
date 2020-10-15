<script context="module">
	export const prerender = true;

	export async function preload({ params }) {
		const res = await this.fetch(`/blog/${params.slug}.json`);
		return {
			post: await res.json()
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