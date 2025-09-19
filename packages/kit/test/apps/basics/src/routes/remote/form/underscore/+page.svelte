<script>
	import { register } from './form.remote.js';

	const username = register.fields.username;
	const _password = register.fields._password;
</script>

<form {...register}>
	<input name={username.name()} value={username.value()} aria-invalid={!!username.issues()} />

	<input
		type="password"
		name={_password.name()}
		value={_password.value()}
		aria-invalid={!!_password.issues()}
	/>

	<button>submit</button>
</form>

<pre>{JSON.stringify(register.fields.issues(), null, '  ')}</pre>

<style>
	[aria-invalid='true'] {
		outline: 2px solid red;
	}
</style>
