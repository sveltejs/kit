<script>
    /**
    * @param {string} method
    */
    async function setcookies(method) {
        const res = await fetch('/multicookie/setcookies', {
            method
        });
        if (res.ok) {
            console.log('res.headers', res.headers.get('set-cookie'));
        }
    }
</script>

<button on:click={async () => (await setcookies('GET'))}>Set cookies GET</button>
<button on:click={async () => (await setcookies('POST'))}>Set cookies POST</button>
