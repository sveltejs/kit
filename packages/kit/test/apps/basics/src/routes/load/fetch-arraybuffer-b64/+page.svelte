<script>
  export let data;

  
  $: arr = [...new Uint8Array(data.data)];

</script>

<span class="test-content">{JSON.stringify(arr)}</span>
