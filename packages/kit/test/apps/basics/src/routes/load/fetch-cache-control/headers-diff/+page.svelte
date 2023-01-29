<script>
	export let data;
	$: ({ error, account } = data);
</script>

<a href="/load/fetch-cache-control">fetch-cache-control</a>

<h2>error</h2>
<div id="error">
	{error.message}
</div>

<h2>amount</h2>
<div id="amount">
	{account.amount}
</div>
