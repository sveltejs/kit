<script>
	import { register } from './form.remote.js';

	const register_form = register();
</script>

<form {...register_form}>
	<input {...register_form.fields.username.as('text')} />
	<input {...register_form.fields._password.as('password')} />

	<button>submit</button>
</form>

<pre>{JSON.stringify(register_form.fields.issues(), null, '  ')}</pre>

<style>
	[aria-invalid='true'] {
		outline: 2px solid red;
	}
</style>
