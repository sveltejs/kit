<script>
	export let data;
</script>

<span>count: {data.count}</span>
<a data-id="tracked" href="?tracked={data.count + 1}">Change test</a>
<a data-id="untracked" href="?tracked={data.count}&untracked={data.count + 1}">Change another param</a>
