<script lang="ts">
	import { upload } from './form.remote';
</script>

<form {...upload} enctype="multipart/form-data">
	<input {...upload.fields.text.as('hidden', 'Hello world')} />
	<input {...upload.fields.file.as('file')} />
	<button>Submit</button>
</form>
