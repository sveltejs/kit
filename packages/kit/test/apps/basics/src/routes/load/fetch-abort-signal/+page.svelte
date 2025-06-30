<script>
	export let data;
</script>

<div>
	<h1>AbortSignal Test Results</h1>
	<p class="aborted-immediately">Aborted immediately: {data.aborted_immediately}</p>
	<p class="aborted-during-request">Aborted during request: {data.aborted_during_request}</p>
	<p class="successful-data">Successful data: {JSON.stringify(data.successful_data)}</p>
</div>
