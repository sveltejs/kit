<script>
	// @ts-ignore
	import { lib_echo } from 'e2e-test-dep-remote';

	let result = $state('');
</script>

<h1>{await lib_echo('hello')}</h1>
<button onclick={async () => (result = await lib_echo('client'))}>call remote function</button>
<p>{result}</p>
