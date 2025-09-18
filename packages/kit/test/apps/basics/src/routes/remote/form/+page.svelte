<script>
	import {
		get_message,
		set_message,
		resolve_deferreds,
		set_reverse_message
	} from './form.remote.js';

	const message = get_message();

	const scoped = set_message.for('scoped');
	const enhanced = set_message.for('enhanced');
</script>

<p>message.current: {message.current}</p>

<!-- TODO use await here once async lands -->
{#await message then m}
	<p>await get_message(): {m}</p>
{/await}

<hr />

<form data-unscoped {...set_message}>
	{#if set_message.issues.message}
		<p>{set_message.issues.message[0].message}</p>
	{/if}

	<input name={set_message.field('message')} value={set_message.input.message} />
	<button>set message</button>
	<button {...set_reverse_message.buttonProps}>set reverse message</button>
</form>

<p>set_message.input.message: {set_message.input.message}</p>
<p>set_message.pending: {set_message.pending}</p>
<p>set_message.result: {set_message.result}</p>
<p>set_reverse_message.result: {set_reverse_message.result}</p>

<hr />

<form data-scoped {...scoped}>
	{#if scoped.issues.message}
		<p>{scoped.issues.message[0].message}</p>
	{/if}

	<input name={scoped.field('message')} value={scoped.input.message} />
	<button>set scoped message</button>
</form>

<p>scoped.input.message: {scoped.input.message}</p>
<p>scoped.pending: {scoped.pending}</p>
<p>scoped.result: {scoped.result}</p>

<hr />

<form
	data-enhanced
	{...enhanced.enhance(async ({ data, submit }) => {
		await submit().updates(get_message().withOverride(() => data.message + ' (override)'));
	})}
>
	{#if enhanced.issues.message}
		<p>{enhanced.issues.message[0].message}</p>
	{/if}

	<input name={enhanced.field('message')} value={enhanced.input.message} />
	<button><span>set enhanced message</span></button>
</form>

<p>enhanced.input.message: {enhanced.input.message}</p>
<p>enhanced.pending: {enhanced.pending}</p>
<p>enhanced.result: {enhanced.result}</p>

<hr />

<form {...resolve_deferreds}>
	<button>resolve deferreds</button>
</form>
