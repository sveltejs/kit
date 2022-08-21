<script>
	export let data;
</script>

<h2>Layout data: {JSON.stringify(data)}</h2>
<a href="/shadowed/parent?test">Reload</a>
<a href="/shadowed/parent/sub">Sub</a>

<slot />
