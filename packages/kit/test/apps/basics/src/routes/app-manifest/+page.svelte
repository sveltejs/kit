<script>
	import { build, files, prerendered, routes } from '$app/manifest';

	let prerendered_json = JSON.stringify(prerendered, null, '  ');
	let routes_json = JSON.stringify(routes, null, '  ');
	let files_json = JSON.stringify(files, null, '  ');
	let build_json = JSON.stringify(build, null, '  ');
</script>

<h1>$app/manifest</h1>

<section data-name="routes">
	<h2>routes</h2>
	<pre>{routes_json}</pre>
</section>

<section data-name="files">
	<h2>files</h2>
	<pre>{files_json}</pre>
</section>

<section data-name="prerendered">
	<h2>prerendered</h2>
	<pre>{prerendered_json}</pre>
</section>

<section data-name="build">
	<h2>build</h2>
	<pre>{build_json}</pre>
</section>
