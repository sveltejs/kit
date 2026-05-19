<script>
	export let data;
</script>

<!-- from .dev.vars -->
<p id="secret">Secret: {data.secret}</p>

<!-- from wrangler.jsonc -->
<p id="var">Var: {data.var}</p>
