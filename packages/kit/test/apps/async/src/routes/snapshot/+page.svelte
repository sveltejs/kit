<script>
	let restored = 'initial';

	export const snapshot = {
		capture() {
			return { restored: 'yes' };
		},
		restore(v) {
			restored = v;
		}
	};
</script>

<pre>{JSON.stringify(restored)}</pre>
