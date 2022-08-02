<script>
	throw new Error("@migration task: Add data prop (https://github.com/sveltejs/kit/discussions/5774#discussioncomment-3292707)");

	/** @type {import('./$types').Data} */
	export let data;
</script>

<h1>{data.type} loads: {data.loads}</h1>
<slot />
