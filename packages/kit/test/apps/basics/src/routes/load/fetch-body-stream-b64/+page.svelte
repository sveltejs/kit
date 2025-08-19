<script>
	export let data;

	$: arr = [...new Uint8Array(data.data)];

	let ok = 'Ok';

	$: {
		const p = new Uint8Array(data.data_long);
		ok = p.length === 256 ? 'Ok' : 'Wrong length';

		if (p.length === 256) {
			for (let i = 0; i < p.length; i++) {
				if (p[i] !== i) {
					ok = `Expected ${i} but got ${p[i]}`;
					break;
				}
			}
		}
	}
</script>

<span class="test-content">{JSON.stringify(arr)}</span>

<br />

{ok}
<span style="word-wrap: break-word;">
	{JSON.stringify([...new Uint8Array(data.data_long)])}
</span>
