<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export async function load({ url }) {
		return {
			props: {
				method: url.searchParams.get('method') || ''
			}
		};
	}
</script>

<script>
	/** @type {string} */
	export let method;
</script>

<h1>{method}</h1>

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
