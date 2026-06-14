<script>
	import { reveal } from './data.remote.js';

	let result = $state('none');
</script>

<button id="reveal" onclick={async () => (result = await reveal())}>reveal</button>
<p id="result">{result}</p>
