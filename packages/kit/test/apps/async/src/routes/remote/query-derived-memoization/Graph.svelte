<script>
	/**
	 * A deep graph of deriveds, in the shape that makes lost memoization expensive.
	 *
	 * Each level has two nodes:
	 *
	 * - `object_n` returns a fresh object, so `equals` always fails and its write version
	 *   increases on every recomputation
	 * - `constant_n` always returns the same value, so `equals` always holds and its write
	 *   version never increases, which leaves it permanently dirtier than the `object_n`
	 *   it reads
	 *
	 * When deriveds are memoized this costs one recomputation per node. When they are not,
	 * every read of a level re-walks the level below it several times over, so the cost is
	 * exponential in the depth. That is the shape a charting library's chart context has, and
	 * why a chart is where this bug surfaces as a frozen tab rather than a slow render.
	 */
	let { rows } = $props();

	/**
	 * @template T
	 * @param {T} value
	 * @returns {T}
	 */
	function counted(value) {
		if (typeof window !== 'undefined') {
			const w = /** @type {Record<string, number>} */ (/** @type {unknown} */ (window));
			w.__recomputations = (w.__recomputations ?? 0) + 1;
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
