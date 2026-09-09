<script>
	let { data } = $props();
</script>

<section>
	<h2>Route seed</h2>
	<p>
		Current route:
		<code>{data.route ?? 'home'}</code>
	</p>
	<p>This page is duplicated by the benchmark harness to create representative routes.</p>
	<p>
		<a href="/ssr">Open the data-heavy SSR route</a>
	</p>
</section>

<style>
	section {
		padding: 1.5rem;
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 1px 2px rgb(15 23 42 / 0.08);
	}

	h2 {
		margin-top: 0;
	}

	code {
		font-family: ui-monospace, monospace;
	}
</style>
