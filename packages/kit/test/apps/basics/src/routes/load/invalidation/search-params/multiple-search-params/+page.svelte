<script>
	export let data;
</script>

<span>count: {data.count}</span>
<a href={`?test=${data.count + 1}&test=2`}>Change test</a>
<a href={`?test=${data.count}&test=3`}>Change second test</a>
