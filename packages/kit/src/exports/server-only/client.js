throw new Error(
	"Cannot import '@sveltejs/kit/server-only' into code that runs in the browser, as this could leak sensitive information. Use this module in server-only code (e.g. in `*.server.js` files or the `server` directory) so that SvelteKit can protect it from being included in the client bundle."
);
