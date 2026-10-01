<script>
	import { afterNavigate, goto, snapshot } from '$app/navigation';
	import { Foo } from '#lib';

	let message = $state('');
	let manual = $state('');
	let foo = $state(new Foo('initial'));
	/** @type {string[]} */
	let order = $state([]);

	snapshot({
		capture: () => message,
		restore: (value) => {
			message = value;
			order.push('restore');
		}
	});

	snapshot({
		id: 'snapshot-helper-manual',
		capture: () => manual,
		restore: (value) => (manual = value)
	});

	snapshot({
		id: 'snapshot-helper-transport',
		capture: () => foo,
		restore: (value) => (foo = value)
	});

	afterNavigate(() => {
		order.push('afterNavigate');
	});
</script>

<label>
	default
	<input data-testid="default" bind:value={message} />
</label>

<label>
	manual
	<input data-testid="manual" bind:value={manual} />
</label>

<button onclick={() => void goto('', { shallow: true, state: { active: true } })}> shallow </button>
<button onclick={() => (foo = new Foo('restored'))}>change transport value</button>

<a href="/snapshot/helper/b">b</a>

<p data-testid="transport">{foo.bar()}</p>
<p data-testid="order">{order.join(',')}</p>
