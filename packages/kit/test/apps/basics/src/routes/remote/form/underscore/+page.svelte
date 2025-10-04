<script>
	import { register } from './form.remote.js';
</script>

<form {...register}>
	<input
		name={register.field('username')}
		value={register.input.username}
		aria-invalid={!!register.issues.username}
	/>

	<input
		type="password"
		name={register.field('_password')}
		value={register.input._password}
		aria-invalid={!!register.issues._password}
	/>

	<button>submit</button>
</form>

<pre>{JSON.stringify(register.issues, null, '  ')}</pre>

<style>
	[aria-invalid='true'] {
		outline: 2px solid red;
	}
</style>
