<script lang="ts">
	import { upload } from './form.remote';
</script>

<form {...upload} enctype="multipart/form-data">
	<input {...upload.fields.text.as('hidden', 'Hello world')} />
	<p>
		File 1: (progress: <span id="progress1">{JSON.stringify(upload.fields.file1.progress())}</span>)
	</p>
	<input {...upload.fields.file1.as('file')} />
	<p>File 2: (progress: {JSON.stringify(upload.fields.deep.files[0].progress())})</p>
	<input {...upload.fields.deep.files[0].as('file')} />
	<p>File 3: (progress: {JSON.stringify(upload.fields.deep.files[1].progress())})</p>
	<input {...upload.fields.deep.files[1].as('file')} />
	<label style:display="block">
		<input {...upload.fields.read_files.as('checkbox')} />
		Read files
	</label>
	<br />
	<br />
	<button>Submit</button>
</form>

<pre>{JSON.stringify(upload.result)}</pre>
