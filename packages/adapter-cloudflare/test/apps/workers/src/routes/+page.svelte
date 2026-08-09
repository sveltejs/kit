<script lang="ts">
	const { data } = $props();
	$effect(() => {
		fetch('/ws')
	})
</script>

<h1>Sum: {data.sum}</h1>
