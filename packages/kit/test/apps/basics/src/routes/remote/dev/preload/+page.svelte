<script>
	import { example } from './example.remote';

	export let data;
</script>

<p>{data.example}</p>
<button onclick={async () => (data.example = await example('baz'))}>Refresh</button>
