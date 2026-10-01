<script>
	import { image_validate_form } from './form.remote.ts';
</script>

<form {...image_validate_form} oninput={() => image_validate_form.validate()}>
	<input {...image_validate_form.fields.name.as('text')} />
	<input
		{...image_validate_form.fields.position.as('image')}
		src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
		alt="submit coordinates"
		width="20"
		height="20"
	/>
</form>

<pre id="name-issues">{JSON.stringify(image_validate_form.fields.name.issues() ?? [])}</pre>
<pre id="position-issues">{JSON.stringify(
		image_validate_form.fields.position.allIssues() ?? []
	)}</pre>
<p id="result">{image_validate_form.result}</p>
