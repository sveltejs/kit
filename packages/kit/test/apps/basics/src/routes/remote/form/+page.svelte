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
	{#if set_message.fields.message.issues()}
		<p>{set_message.fields.message.issues()[0].message}</p>
	{/if}

	<input {...set_message.fields.message.as('text')} />
	<button>set message</button>
	<button {...set_reverse_message.buttonProps}>set reverse message</button>
</form>

<p>set_message.input.message: {set_message.fields.message.value()}</p>
<p>set_message.pending: {set_message.pending}</p>
<p>set_message.result: {set_message.result}</p>
<p>set_reverse_message.result: {set_reverse_message.result}</p>

<hr />

<form data-scoped {...scoped}>
	{#if scoped.fields.message.issues()}
		<p>{scoped.fields.message.issues()[0].message}</p>
	{/if}

	<input {...scoped.fields.message.as('text')} />
	<button>set scoped message</button>
</form>

<p>scoped.input.message: {scoped.fields.message.value()}</p>
<p>scoped.pending: {scoped.pending}</p>
<p>scoped.result: {scoped.result}</p>

<hr />

<form
	data-enhanced
	{...enhanced.enhance(async ({ data, submit }) => {
		await submit().updates(get_message().withOverride(() => data.message + ' (override)'));
	})}
>
	{#if enhanced.fields.message.issues()}
		<p>{enhanced.fields.message.issues()[0].message}</p>
	{/if}

	<input {...enhanced.fields.message.as('text')} />
	<button><span>set enhanced message</span></button>
</form>

<p>enhanced.input.message: {enhanced.fields.message.value()}</p>
<p>enhanced.pending: {enhanced.pending}</p>
<p>enhanced.result: {enhanced.result}</p>

<hr />

<form {...resolve_deferreds}>
	<button>resolve deferreds</button>
</form>
