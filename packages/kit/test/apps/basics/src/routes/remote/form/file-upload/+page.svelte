<script lang="ts">
	import { upload } from './form.remote';
	const upload_form = upload();
</script>

<form {...upload_form} enctype="multipart/form-data">
	<input {...upload_form.fields.text.as('hidden', 'Hello world')} />
	<p>File 1:</p>
	<input {...upload_form.fields.file1.as('file')} />
	<p>File 2:</p>
	<input {...upload_form.fields.file2.as('file')} />
	<label style:display="block">
		<input {...upload_form.fields.read_files.as('checkbox')} />
		Read files
	</label>
	<br />
	<br />
	<button>Submit</button>
</form>

<pre>{JSON.stringify(upload_form.result)}</pre>
