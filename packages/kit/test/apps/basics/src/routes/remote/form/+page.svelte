<script>
	import {
		get_message,
		set_message,
		resolve_deferreds,
		set_reverse_message
	} from './form.remote.js';

	const message = get_message();

	const scoped = set_message('scoped');
	const enhanced = set_message('enhanced');
	const message_form = set_message();
	const reverse_message_form = set_reverse_message();
	const deferreds = resolve_deferreds();
</script>

<p>message.current: {message.current}</p>

<!-- TODO use await here once async lands -->
{#await message then m}
	<p>await get_message(): {m}</p>
{/await}

<hr />

<form data-unscoped {...message_form}>
	{#if message_form.fields.message.issues()}
		<p>{message_form.fields.message.issues()[0].message}</p>
	{/if}

	<input {...message_form.fields.message.as('text')} />
	<button>set message</button>
	<button {...reverse_message_form.buttonProps}>set reverse message</button>
</form>

<p>set_message.input.message: {message_form.fields.message.value()}</p>
<p>set_message.pending: {message_form.pending}</p>
<p>set_message.result: {message_form.result}</p>
<p>set_reverse_message.result: {reverse_message_form.result}</p>

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

<form {...deferreds}>
	<button>resolve deferreds</button>
</form>
