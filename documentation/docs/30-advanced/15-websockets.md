---
title: WebSockets
---

## The `socket` object

[WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) provide a way to open a bidirectional communication channel between the client and server.

A `+server.js` file can export a `socket` object to handle WebSocket connections.

In the `socket` object, you must define [hooks](https://crossws.unjs.io/guide/hooks) to handle the different stages of the WebSocket lifecycle.

```js
/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	upgrade(req) {
        // ...
	},

	open(peer) {
        // ...
	},

	message(peer, message) {
        // ...
	},

	close(peer, event) {
		// ...
	},

	error(peer, error) {
		// ...
	}
};
```

### Upgrade

The `upgrade` hook is called when a WebSocket connection is established, and can be used to accept or reject the connection attempt.

Additionally, you can use the [`accept`](@sveltejs-kit#accept) or [`error`](@sveltejs-kit#error) functions imported from `@sveltejs/kit` to easily accept or reject connections. It receives the [request](https://developer.mozilla.org/docs/Web/API/Request) object as a parameter.

```js
import { accept, error } from "@sveltejs/kit";

/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	upgrade(request) {
		if (request.headers.get('origin') !== 'allowed_origin') {
			// Reject the WebSocket connection by throwing an error
			error(403, 'Forbidden');
		}

		// Accept the WebSocket connection by returning a response
		return accept();
	}

	// ...
};
```

### Open

The `open` hook is called when a WebSocket connection is opened. It receives the [peer](https://crossws.unjs.io/guide/peer) object, to allow interacting with connected clients, as a parameter.

```js
/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	open(peer) {
		// ...
	}
};
```

### Message

The `message` hook is called when a message is received from the client. It receives the [peer](https://crossws.unjs.io/guide/peer) object, to allow interacting with connected clients, and the [message](https://crossws.unjs.io/guide/message) object, containing data from the client, as parameters.

```js
/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	message(peer, message) {
		// ...
	}
};
```

### Close

The `close` hook is called when a WebSocket connection is closed. It receives the [peer](https://crossws.unjs.io/guide/peer) object, to allow interacting with connected clients, and the close event object, containing the [WebSocket connection close code](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code#value) and reason, as parameters.

```js
/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	close(peer, event) {
		// ...
	}
};
```

### Error

The `error` hook is called when a WebSocket connection error occurs. It receives the [peer](https://crossws.unjs.io/guide/peer) object, to allow interacting with connected clients, and the error as parameters.

```js
/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	error(peer, error) {
		// ...
	}
};
```

## Connecting from the client

To connect to a WebSocket endpoint, you can use the [`WebSocket`](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket) constructor in the browser.

```svelte
<script>
	import { onMount } from 'svelte';

	onMount(() => {
		// To connect to src/routes/ws/+server.js
		const socket = new WebSocket(`/ws`);

		socket.addEventListener("open", (event) => {
			socket.send("Hello Server!");
		});

		// ...
	});
</script>
```

See [the WebSocket documentation on MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) for more details.

## Compatibility

SvelteKit uses [`unjs/crossws`](https://crossws.unjs.io) to handle cross-platform WebSocket connections. Please refer to their [compatibility table](https://crossws.unjs.io/guide/peer#compatibility) for the `peer` object in different runtime environments.
