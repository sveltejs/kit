<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<form method="POST" use:enhance>
	<button type="submit">submit</button>
</form>

{#if form}
	<h1>{form?.foo?.bar()}</h1>
{/if}

<a href="/serialization-basic">To basic form</a>
