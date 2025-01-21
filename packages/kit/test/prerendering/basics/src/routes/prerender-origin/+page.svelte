<script>
	import { page } from '$app/stores';
	const href = new URL('/prerender-origin/dynamic', $page.url.origin).href;
</script>

<a {href}>Please crawl this</a>
