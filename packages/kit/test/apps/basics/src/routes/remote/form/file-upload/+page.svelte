<script lang="ts">
	import { upload } from './form.remote';
</script>

<form {...upload} enctype="multipart/form-data">
	<input {...upload.fields.text.as('hidden', 'Hello world')} />
	<p>File 1:</p>
	<input {...upload.fields.file1.as('file')} />
	<p>File 2:</p>
	<input {...upload.fields.file2.as('file')} />
	<label style:display="block">
		<input {...upload.fields.read_files.as('checkbox')} />
		Read files
	</label>
	<br />
	<br />
	<button>Submit</button>
</form>

<pre>{JSON.stringify(upload.result)}</pre>
