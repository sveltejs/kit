---
title: WebSockets
---

[WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) provide a way to open a bidirectional communication channel between a client and a server. SvelteKit uses [crossws](https://crossws.unjs.io/) to provide a consistent interface across different platforms.

## The `socket` object

A `+server.js` file can export a `socket` object with [hooks](https://crossws.unjs.io/guide/hooks), all optional, to handle the different stages of the WebSocket lifecycle.

```js
/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	upgrade(event) {
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

### upgrade

The `upgrade` hook is called before a WebSocket connection is established. It receives a [RequestEvent](@sveltejs-kit#RequestEvent) object that has an additional [`context`](https://crossws.unjs.io/guide/peer#peercontext) property to store abitrary information that is shared with that connection's [`Peer`](https://crossws.unjs.io/guide/peer) object.

You can use the [`error`](@sveltejs-kit#error) function imported from `@sveltejs/kit` to easily reject connections. Requests will be auto-accepted if the `upgrade` hook is not defined or does not `error`.

```js
import { error } from "@sveltejs/kit";

/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	upgrade({ request }) {
		if (request.headers.get('origin') !== 'my_allowed_origin') {
			// Reject the WebSocket connection by throwing an error
			error(403, 'Forbidden');
		}
	}
};
```

### open

The `open` hook is called when a WebSocket connection is opened. It receives a [Peer](https://crossws.unjs.io/guide/peer) object to allow interacting with connected clients.

```js
/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	open(peer) {
		// ...
	}
};
```

### message

The `message` hook is called when a message is received from the client. It receives the [Peer](https://crossws.unjs.io/guide/peer) object to allow interacting with connected clients and the [Message](https://crossws.unjs.io/guide/message) object which contains data from the client.

```js
/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	message(peer, message) {
		// ...
	}
};
```

### close

The `close` hook is called when a WebSocket connection is closed. It receives the [Peer](https://crossws.unjs.io/guide/peer) object to allow interacting with connected clients and the close event object which contains the [WebSocket connection close code](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code#value) and reason.

```js
/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	close(peer, event) {
		// ...
	}
};
```

### error

The `error` hook is called when a connection with a WebSocket has been closed due to an error. It receives the [Peer](https://crossws.unjs.io/guide/peer) object to allow interacting with connected clients and the error.

```js
/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	error(peer, error) {
		// ...
	}
};
```

## `getPeers` and `publish`

The [`getPeers`]($app-server#getPeers) and [`publish`]($app-server#publish) functions from `$app/server` can be used to interact with your WebSocket connections from anywhere on the server.

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

Please refer to the crossws [`Peer` object compatibility table](https://crossws.unjs.io/guide/peer#compatibility) and [`Message` object compatibility table](https://crossws.unjs.io/guide/message#adapter-support) to know what is supported in different runtime environments.
