<script>
	let n = 0;
</script>

<button on:click={() => n += 1}>
	clicks: {n}
</button>

<a href="/no-router/a">a</a>
<a href="/no-router/b">b</a>

<slot></slot>