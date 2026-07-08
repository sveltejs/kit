<script lang="ts">
	let { data } = $props();
</script>

<h1>{data.message}</h1>
<p id="timestamp">{data.timestamp}</p>
