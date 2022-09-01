<script>
    import { form } from '$app/stores';
</script>

<p>Result: {$form?.errors.result}</p>

<form method="post" enctype="multipart/form-data">
    <input name="file" type="file" />
    <button>Submit</button>
</form>
