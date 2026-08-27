<script>
	/**
	 * A graph of deriveds in the shape that makes lost memoization expensive: each
	 * `constant_n` returns the same value every time, so it stays dirtier than the
	 * `object_n` it reads, and every unmemoized read re-walks the levels below it.
	 */
	let { rows } = $props();

	/**
	 * @template T
	 * @param {T} value
	 * @returns {T}
	 */
	function counted(value) {
		if (typeof window !== 'undefined') {
			window.__recomputations = (window.__recomputations ?? 0) + 1;
		}

		return value;
	}

	const object_0 = $derived(counted({ n: rows.length }));
	const constant_0 = $derived(counted(object_0.n >= 0 ? null : 1));
	const object_1 = $derived(counted({ n: object_0.n + (constant_0 ?? 0) }));
	const constant_1 = $derived(counted(object_1.n >= 0 ? null : 1));
	const object_2 = $derived(counted({ n: object_1.n + (constant_1 ?? 0) }));
	const constant_2 = $derived(counted(object_2.n >= 0 ? null : 1));
	const object_3 = $derived(counted({ n: object_2.n + (constant_2 ?? 0) }));
	const constant_3 = $derived(counted(object_3.n >= 0 ? null : 1));
	const object_4 = $derived(counted({ n: object_3.n + (constant_3 ?? 0) }));
	const constant_4 = $derived(counted(object_4.n >= 0 ? null : 1));
	const object_5 = $derived(counted({ n: object_4.n + (constant_4 ?? 0) }));
	const constant_5 = $derived(counted(object_5.n >= 0 ? null : 1));
	const object_6 = $derived(counted({ n: object_5.n + (constant_5 ?? 0) }));
	const constant_6 = $derived(counted(object_6.n >= 0 ? null : 1));
</script>

<p id="result">{object_6.n}{constant_6 ?? ''}</p>
