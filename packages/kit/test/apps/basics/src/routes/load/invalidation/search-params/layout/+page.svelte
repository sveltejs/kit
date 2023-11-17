<script>
	export let data;
</script>

<span>count: {data.count}</span>
<a href={`?test=${data.count + 1}`}>Change test</a>
<a href={`?test=${data.count}&another=another`}>Change another param</a>
