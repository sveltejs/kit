<script>
	import { setup } from '../../../../setup.js';

	/** @type {import('./$types').LayoutData} */
	export let data;

	setup();
</script>

<slot />

<footer>{data.foo.bar}</footer>

<style>
	footer {
		color: purple;
	}
</style>
