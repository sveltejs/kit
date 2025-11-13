<script>
	import { register } from './form.remote.js';
</script>

<form {...register}>
	<input {...register.fields.username.as('text')} />
	<input {...register.fields._password.as('password')} />

	<button>submit</button>
</form>

<pre>{JSON.stringify(register.fields.issues(), null, '  ')}</pre>

<style>
	[aria-invalid='true'] {
		outline: 2px solid red;
	}
</style>
