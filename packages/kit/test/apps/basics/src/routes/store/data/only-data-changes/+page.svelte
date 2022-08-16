<script>
    import { page, session } from '$app/stores';
    export let data;
</script>

<pre id="page-data">{JSON.stringify(data)}</pre>
<pre id="store-data">{JSON.stringify($page.data)}</pre>

<button on:click={() => $session = { answer: 1337 }}>Update Session</button>
