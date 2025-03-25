<script>
	import { setup } from '../../../../setup.js';
	import '../app.css';

	let { children } = $props();

	setup();
</script>

{@render children()}
