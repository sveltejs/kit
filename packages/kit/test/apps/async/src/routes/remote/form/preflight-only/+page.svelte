<script>
	import { get, set } from './form.remote.js';
	import * as v from 'valibot';

	const data = get();

	const schema = v.object({
		a: v.pipe(v.string(), v.maxLength(7, 'a is too long')),
		b: v.string(),
		c: v.string()
	});
	const set_form = set({
		preflight: schema
	});
</script>

<p>a: {(await data).a}</p>
<p>b: {(await data).b}</p>
<p>c: {(await data).c}</p>

<hr />

<form
	{...set_form}
	oninput={() => set_form.validate({ preflightOnly: true })}
	onchange={() => set_form.validate()}
>
	<input {...set_form.fields.a.as('text')} />
	<input {...set_form.fields.b.as('text')} />
	<input {...set_form.fields.c.as('text')} />

	<button>submit</button>
</form>

<div class="issues">
	{#each set_form.fields.allIssues() as issue}
		<p>{issue.message}</p>
	{/each}
</div>
