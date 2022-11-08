<script>
	/** @param {string} type */
	async function fail(type) {
		await fetch(`/errors/error-html/make-root-fail?type=${type}`);
		if (type === 'redirect') {
			location.assign(location.href + '/404');
		} else {
			location.reload();
		}
	}
</script>

<button on:click={() => fail('unexpected')}>Unexpected</button>
<button on:click={() => fail('expected')}>Expected</button>
<button on:click={() => fail('redirect')}>Redirect</button>
