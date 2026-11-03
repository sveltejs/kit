<script>
	let { data } = $props();
</script>

<a data-testid="resolved-link" href={data.link}>hello</a>
<a data-testid="resolved-asset" href={data.asset}>answer</a>
