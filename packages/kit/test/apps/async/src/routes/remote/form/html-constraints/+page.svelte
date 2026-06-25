<script>
	import { validate_code, validate_code_preflight } from './form.remote.ts';
	import * as v from 'valibot';

	const schema = v.object({
		code: v.string()
	});
</script>

<form data-submit {...validate_code}>
	<input {...validate_code.fields.code.as('text')} required minlength={6} maxlength={6} />
	<button type="submit">submit</button>
	<button type="button" data-programmatic-submit onclick={() => validate_code.fields.code.set('1')}>
		set programmatically
	</button>
</form>

<p id="result">{validate_code.result || ''}</p>

<form
	data-preflight
	{...validate_code_preflight.preflight(schema)}
	onchange={() => validate_code_preflight.validate({ preflightOnly: true })}
>
	<input {...validate_code_preflight.fields.code.as('text')} required minlength={6} maxlength={6} />
	<button
		type="button"
		data-programmatic-preflight
		onclick={async () => {
			validate_code_preflight.fields.code.set('1');
			await validate_code_preflight.validate({ preflightOnly: true });
		}}
	>
		set & validate
	</button>
</form>

<p id="preflight-issue-count">{validate_code_preflight.fields.code.issues()?.length ?? 0}</p>
