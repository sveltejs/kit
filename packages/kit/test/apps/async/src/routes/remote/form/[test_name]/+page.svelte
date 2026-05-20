<script>
	import { get_message, set_message, resolve_deferreds } from './form.remote.ts';

	const { params } = $props();

	const message = get_message(params.test_name);

	const scoped = set_message.for(`scoped:${params.test_name}`);
	const enhanced = set_message.for(`enhanced:${params.test_name}`);

	let submit_result = $state('none');
	let imperative_submit_result = $state('none');
	let callback_element_matches = $state('unknown');
	let callback_has_enhance = $state('unknown');
</script>

<p>message.current: {message.current}</p>

<p>await get_message(): {await message}</p>

<hr />

<form data-unscoped {...set_message}>
	{#if set_message.fields.message.issues()}
		<p>{set_message.fields.message.issues()?.[0].message}</p>
	{/if}

	<input {...set_message.fields.message.as('text')} />
	<input {...set_message.fields.test_name.as('hidden', params.test_name)} />

	<button {...set_message.fields.action.as('submit', 'normal')}>set message</button>
	<button {...set_message.fields.action.as('submit', 'reverse')}>set reverse message</button>
</form>

<p>set_message.input.message: {set_message.fields.message.value()}</p>
<p>set_message.pending: {set_message.pending}</p>
<p>set_message.result: {set_message.result}</p>

<hr />

<form data-scoped {...scoped}>
	{#if scoped.fields.message.issues()}
		<p>{scoped.fields.message.issues()?.[0].message}</p>
	{/if}

	<input {...scoped.fields.message.as('text')} />
	<input {...scoped.fields.test_name.as('hidden', params.test_name)} />
	<button>set scoped message</button>
</form>

<p>scoped.input.message: {scoped.fields.message.value()}</p>
<p>scoped.pending: {scoped.pending}</p>
<p>scoped.result: {scoped.result}</p>

<hr />

<form
	data-enhanced
	{...enhanced.enhance(async (form) => {
		const instance = /** @type {any} */ (form);
		callback_element_matches = String(instance.element === /** @type {any} */ (enhanced).element);
		callback_has_enhance = String('enhance' in instance);
		submit_result = String(
			await instance
				.submit()
				.updates(message.withOverride(() => instance.fields.message.value() + ' (override)'))
		);
	})}
>
	{#if enhanced.fields.message.issues()}
		<p>{enhanced.fields.message.issues()?.[0].message}</p>
	{/if}

	<input {...enhanced.fields.message.as('text')} />
	<input {...enhanced.fields.test_name.as('hidden', params.test_name)} />
	<button><span>set enhanced message</span></button>
</form>

<p>enhanced.input.message: {enhanced.fields.message.value()}</p>
<p>enhanced.pending: {enhanced.pending}</p>
<p>enhanced.result: {enhanced.result}</p>
<p>enhanced.submit_result: {submit_result}</p>
<p>enhanced.element: {/** @type {any} */ (enhanced).element ? 'attached' : 'null'}</p>
<p>enhanced.callback_element_matches: {callback_element_matches}</p>
<p>enhanced.callback_has_enhance: {callback_has_enhance}</p>
<p>enhanced.imperative_submit_result: {imperative_submit_result}</p>

<button
	type="button"
	onclick={async () => {
		imperative_submit_result = String(await /** @type {any} */ (enhanced).submit());
	}}
>
	submit enhanced programmatically
</button>

<hr />

<form {...resolve_deferreds}>
	<button>resolve deferreds</button>
	<input {...resolve_deferreds.fields.test_name.as('hidden', params.test_name)} />
</form>
