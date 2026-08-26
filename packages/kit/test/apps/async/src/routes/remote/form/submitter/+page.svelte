<script>
	import { image_form, my_form } from './form.remote.ts';
</script>

<form {...my_form}>
	<button {...my_form.fields.submitter.as('submit', 'hello')}>submit</button>
</form>

<p id="result">{my_form.result}</p>

<form {...image_form}>
	<input
		{...image_form.fields.position.as('image')}
		src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
		alt="submit coordinates"
		width="20"
		height="20"
	/>
</form>

<p id="image-result">{image_form.result}</p>
