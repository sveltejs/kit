---
title: WebSockets
---

## The `socket` object

Websockets are a way to open a bi-directional communication channel between the client and the server.

SvelteKit accepts a `socket` object in `+server.js` files that you can use to handle websocket connections to different routes in your app.

The shape of this socket object directly corresponds to the [Hooks](https://crossws.unjs.io/guide/hooks) type in `crossws` as this is the package being used to handle cross-platform websocket connections.

```js
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

The `upgrade` hook is called when a websocket connection is established, and can be used to accept or reject the websocket connection.

Additionally, SvelteKit provides `accept` and `reject` helper functions to easily accept or reject connections.

```js
import { reject, accept } from "@sveltejs/kit";

export const socket = {
	upgrade(req) {
		 // Accept the websocket connection
		return accept();

        // Reject the websocket connection
        reject(401, 'unauthorized');
	}
    
    // ...
};
```

### Open

The `open` hook is called when a websocket connection is opened. It receives the [peer](https://crossws.unjs.io/guide/peer) WebSocket object as a parameter.

```js
export const socket = {
	open(peer) {
		// ...
	}
};
```

### Message

The `message` hook is called when a message is received from the client. It receives the [peer](https://crossws.unjs.io/guide/peer) WebSocket object and the [message](https://crossws.unjs.io/guide/message) as parameters.

```js
export const socket = {
	message(peer, message) {
		// ...
	}
};
```

### Close

The `close` hook is called when a websocket connection is closed. It receives the [peer](https://crossws.unjs.io/guide/peer) WebSocket object and the close event as parameters.

```js
export const socket = {
	close(peer, event) {
		// ...
	}
};
```

### Error

The `error` hook is called when a websocket connection error occurs. It receives the [peer](https://crossws.unjs.io/guide/peer) WebSocket object and the error as parameters.

```js
export const socket = {
	error(peer, error) {
		// ...
	}
};
```

## Connecting from the client

To connect to a WebSocket endpoint in SvelteKit, you can use the native `WebSocket` class in the browser.

The connection URL is the path to the websocket endpoint, which is the same as the path the `+server.js` file would respond to for other HTTP requests.

```js
const socket = new WebSocket(`/ws`);
```

The WebSocket API is documented in [more detail here](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket).

## Compatibility

SvelteKit uses `crossws` to handle websocket connections. This package has a well documented [compatibility table](https://crossws.unjs.io/guide/peer#compatibility) for the peer object in different runtime environments, Please refer to their documentation for more information.

## Adapter Integrations

For those interested in integrating websocket support into their own SvelteKitadapters, please refer to the crossws [adapter integration guides here](https://crossws.unjs.io/adapters) for more information.