---
title: WebSockets
---

## The `socket` object

[WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) provide a way to open a bidirectional communication channel between the client and server.

A `+server.js` file can export a `socket` object to handle WebSocket connections.

The shape of this socket object directly corresponds to the [Hooks](https://crossws.unjs.io/guide/hooks) type in `crossws` as this is the package being used to handle cross-platform WebSocket connections.

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

Additionally, SvelteKit provides a WebSocket specific `accept` helper function alongside the existing `error` function used for HTTP errors to easily accept or reject connections.

```js
import { error, accept } from "@sveltejs/kit";

/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	upgrade(req) {
		// Accept the WebSocket connection with a return
		return accept();

		// Reject the WebSocket connection with a standard SvelteKit error
		error(401, 'unauthorized');
	}
    
    // ...
};
```

### Open

The `open` hook is called when a WebSocket connection is opened. It receives the [peer](https://crossws.unjs.io/guide/peer) WebSocket object as a parameter.

```js
/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	open(peer) {
		// ...
	}
};
```

### Message

The `message` hook is called when a message is received from the client. It receives the [peer](https://crossws.unjs.io/guide/peer) WebSocket object and the [message](https://crossws.unjs.io/guide/message) as parameters.

```js
/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	message(peer, message) {
		// ...
	}
};
```

### Close

The `close` hook is called when a WebSocket connection is closed. It receives the [peer](https://crossws.unjs.io/guide/peer) WebSocket object and the close event as parameters.

```js
/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	close(peer, event) {
		// ...
	}
};
```

### Error

The `error` hook is called when a WebSocket connection error occurs. It receives the [peer](https://crossws.unjs.io/guide/peer) WebSocket object and the error as parameters.

```js
/** @type {import('@sveltejs/kit').Socket} **/
export const socket = {
	error(peer, error) {
		// ...
	}
};
```

## Connecting from the client

To connect to a WebSocket endpoint in SvelteKit, you can use the native `WebSocket` class in the browser.

```js
// To connect to src/routes/ws/+server.js
const socket = new WebSocket(`/ws`);
```

See [the WebSocket documentation on MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket) for more details.

## Compatibility

SvelteKit uses [`unjs/crossws`](https://crossws.unjs.io) to handle WebSocket connections. Please refer to their [compatibility table](https://crossws.unjs.io/guide/peer#compatibility) for the `Peer` object in different runtime environments.