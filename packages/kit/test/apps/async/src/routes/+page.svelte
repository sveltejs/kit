<script lang="ts" module>
	import { routes } from '$app/manifest';
</script>

<h3>Tests</h3>
<ul style:font-family="sans-serif">
	{#each routes as route}
		<li>
			<a href={route.id}>{route.id}</a>
		</li>
	{/each}
</ul>
