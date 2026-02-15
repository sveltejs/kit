<script>
	import { validate_code, validate_code_preflight } from './form.remote.ts';
	import * as v from 'valibot';

	const schema = v.object({
		code: v.string()
	});
</script>

<form data-submit {...validate_code}>
	<input {...validate_code.fields.code.as('text')} required minlength={6} maxlength={6} />
	<button>submit</button>
</form>

<p id="result">{validate_code.result || ''}</p>

<form
	data-preflight
	{...validate_code_preflight.preflight(schema)}
	onchange={() => validate_code_preflight.validate({ preflightOnly: true })}
>
	<input {...validate_code_preflight.fields.code.as('text')} required minlength={6} maxlength={6} />
</form>

<p id="preflight-issue-count">{validate_code_preflight.fields.code.issues()?.length ?? 0}</p>
