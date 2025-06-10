<script>
	export let data;
</script>

<div>
	<h1>AbortSignal Test Results</h1>
	<p class="aborted-immediately">Aborted immediately: {data.abortedImmediately}</p>
	<p class="aborted-during-request">Aborted during request: {data.abortedDuringRequest}</p>
	<p class="successful-data">Successful data: {JSON.stringify(data.successfulData)}</p>
</div>
