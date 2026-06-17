<script>
	import { afterNavigate } from '$app/navigation';

	/** @type {string[]} */
	let order = [];

	/** @type {import('./$types').Snapshot<string>} */
	export const snapshot = {
		capture: () => '',
		restore: () => {
			order = [...order, 'restore'];
		}
	};

	afterNavigate(() => {
		order = [...order, 'afterNavigate'];
	});
</script>

<p data-testid="order">{order.join(',')}</p>
