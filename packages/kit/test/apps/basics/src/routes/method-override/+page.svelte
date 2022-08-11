<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>{data.method}</h1>

<form action="/method-override/fetch.json?_method=PATCH" method="POST">
	<input name="methodoverride" />
	<button>PATCH</button>
</form>

<form action="/method-override/fetch.json?_method=DELETE" method="POST">
	<input name="methodoverride" />
	<button>DELETE</button>
</form>

<form action="/method-override/fetch.json?_method=POST" method="GET">
	<input name="methodoverride" />
	<button>No Override From GET</button>
</form>

<form action="/method-override/fetch.json?_method=GET" method="POST">
	<input name="methodoverride" />
	<button>No Override To GET</button>
</form>

<form action="/method-override/fetch.json?_method=CONNECT" method="POST">
	<input name="methodoverride" />
	<button>No Override To CONNECT</button>
</form>
