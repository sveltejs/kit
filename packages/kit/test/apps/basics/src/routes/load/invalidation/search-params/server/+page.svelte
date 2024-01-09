<script>
	export let data;
</script>

<span>count: {data.count}</span>

<a data-id="tracked" href="?a={data.count + 1}">Change tracked parameter</a>
<a data-id="untracked" href="?a={data.count}&b={data.count + 1}">Change untracked parameter</a>
