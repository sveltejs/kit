<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
</script>

<h1>a</h1>

<p>active: {page.state.active ?? false}</p>
<span data-id="shallow">{page.shallow ? page.shallow.url.pathname : 'null'}</span>

<button
	data-id="shallow-b"
	onclick={() =>
		goto('/shallow-routing/push-state/b', {
			shallow: true,
			state: { active: true }
		})}>shallow to b</button
>
