<script lang="ts">
	/** @type {import('./$types').LayoutData} */
	export let data;
</script>

<slot />

<div id="error-layout-data">{data.answer}</div>
