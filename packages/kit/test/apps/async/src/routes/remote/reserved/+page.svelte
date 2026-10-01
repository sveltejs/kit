<script lang="ts">
	import * as reserved from './reserved.remote';

	let result = $state('pending');

	async function run() {
		const del = await reserved.delete();
		const cls = await reserved.class();
		const ret = await reserved.return();
		result = `${del}/${cls}/${ret}`;
	}
</script>

<p id="reserved-result">{result}</p>

<button onclick={run} id="reserved-run">run</button>
