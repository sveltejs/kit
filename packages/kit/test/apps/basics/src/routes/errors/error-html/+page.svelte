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

<button onclick={() => fail('unexpected')}>Unexpected</button>
<button onclick={() => fail('expected')}>Expected</button>
<button onclick={() => fail('redirect')}>Redirect</button>
