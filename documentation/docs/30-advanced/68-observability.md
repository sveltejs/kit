---
title: Observability
---

<blockquote class="since note">
	<p>Available since 2.29</p>
</blockquote>

> [!NOTE] This feature is experimental. Expect bugs and breaking changes in minor versions (though we'll do our best to keep those to an absolute minimum). Please provide feedback!

Sometimes, you may need to observe how your application is behaving in order to improve performance or find the root cause of a pesky bug. To help with this, SvelteKit can emit server-side [OpenTelemetry](https://opentelemetry.io) spans for the following:

- [`handle`](hooks#Server-hooks-handle) hook (`handle` functions running in a [`sequence`](@sveltejs-kit-hooks#sequence) will show up as children of each other and the root handle hook)
- [`load`](load) functions (includes universal `load` functions when they're run on the server)
- [Form actions](form-actions)
- [Remote functions](remote-functions)

Just telling SvelteKit to emit spans won't get you far, though — you need to actually collect them somewhere to be able to view them. SvelteKit provides `src/instrumentation.server.ts` as a place to write your tracing setup and instrumentation code. It's guaranteed to be run prior to your application code being imported, providing your deployment platform supports it and your adapter is aware of it.

To enable both of these features, add the following to your `svelte.config.js`:

```js
/// file: svelte.config.js
export default {
	kit: {
		+++experimental: {
			tracing: {
				server: true
			},
			instrumentation: {
				server: true
			}
		}+++
	}
};
```

> [!NOTE] Tracing — and more significantly, observability instrumentation — can have a nontrivial overhead. Before you go all-in on tracing, consider whether or not you really need it, or if it might be more appropriate to turn it on in development and preview environments only.

## Agumenting SvelteKit's builtin tracing

SvelteKit provides access to the `root` span and the `current` span on the request event. The root span is the one associated with your root `handle` function, and the current span could be associated with `handle`, `load`, a form action, or a remote function, depending on the context. You can annotate these spans with any attributes you wish to record:

```js
/// file: $lib/authenticate.ts
async function authenticate() {
	const event = getRequestEvent();
	const user = await getAuthenticatedUser(event);
	event.tracing.root.setAttribute('userId', user.id);
}
```

## Development quickstart

To view your first trace, you'll need to set up a local collector. We'll use [Jaeger](https://www.jaegertracing.io/docs/getting-started/) in this example, as they provide an easy-to-use quickstart command. Once your collector is running locally:

- Turn on the experimental flag mentioned above in your `svelte.config.js` file
- Use your package manager to install the dependencies you'll need
  ```sh
  npm i @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-oltp-proto import-in-the-middle
  ```
- Create `src/instrumentation.server.ts` with the following:

```ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { createAddHookMessageChannel } from 'import-in-the-middle';
import { register } from 'module';

const { registerOptions } = createAddHookMessageChannel();
register('import-in-the-middle/hook.mjs', import.meta.url, registerOptions);

const sdk = new NodeSDK({
	serviceName: 'test-sveltekit-tracing',
	traceExporter: new OTLPTraceExporter(),
	instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
```

Any server-side requests will now begin generating traces, which you can view in Jaeger's web console at [localhost:16686](http://localhost:16686).
