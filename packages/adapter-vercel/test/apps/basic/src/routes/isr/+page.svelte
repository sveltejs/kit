<script lang="ts">
	let { data, form } = $props();
</script>

<h1>ISR Page</h1>
<p id="rendered-at">{data.rendered_at}</p>

<form method="POST">
	<button>Submit</button>
</form>

{#if form?.success}
	<p id="form-success">success</p>
{/if}
