## tracing_api_missing

> Tracing is enabled (see the SvelteKit plugin `tracing.server` option in your vite.config.js), but `@opentelemetry/api` is not available. This error will likely resolve itself when you set up your tracing instrumentation in `instrumentation.server.js`. For more information, see https://svelte.dev/docs/kit/observability#opentelemetry-api

SvelteKit creates its [tracing spans](https://svelte.dev/docs/kit/observability) with `@opentelemetry/api`, which is a dependency of the instrumentation packages that you use to export them. Set up your instrumentation in `src/instrumentation.server.js`, or install `@opentelemetry/api` directly. If you don't want tracing, disable the `tracing.server` option.
