<script>
	import { afterNavigate, snapshot } from '$app/navigation';

	let message = $state('');
	/** @type {string[]} */
	let order = $state([]);

	snapshot({
		id: 'message',
		capture: () => message,
		restore: (value) => {
			message = value;
			order.push('restore');
		},
		reset: () => {
			message = '';
			order.push('reset');
		}
	});

	afterNavigate(() => {
		order.push('afterNavigate');
	});
</script>

<input bind:value={message} />
<p data-testid="order">{order.join(',')}</p>
