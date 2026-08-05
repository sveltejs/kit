// The mere presence of this file makes adapter-node call `builder.instrument()`
// (with `env: 'process.env'` on the eager-env branch), generating the env-init
// facade — the code path under test.
console.log('[instrumentation] evaluated');
