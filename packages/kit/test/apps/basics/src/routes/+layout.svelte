<script lang="ts">
	import { setup } from '../../../../setup.js';

	/** @type {import('./$types').LayoutData} */
	export let data;

	setup();
</script>

<slot />

<div id="root-layout">{data.rootlayout}</div>
<footer>{data.foo.bar}</footer>

<style>
	footer {
		color: purple;
	}
</style>
