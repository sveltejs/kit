<script context="module">
	/** @type {import('@sveltejs/kit').Load} */
	export function load({ params }) {
		if (params.item === 'xxx') {
			throw new Error('Params = xxx');
		}

		return {
			stuff: {
				page: params.item,
				value: 456
			},
			error: params.item === 'yyy' ? 'Params = yyy' : undefined
		};
	}
</script>
