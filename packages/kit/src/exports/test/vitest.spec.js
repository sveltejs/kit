import { assert, expect, test, describe } from 'vitest';
import { fileURLToPath } from 'node:url';
import { createTestEvent, withRequestContext, callRemote } from './index.js';
import { svelteKitTest } from './vitest.js';
import { echo, say_ok, greeting_form } from './fixtures/sample.remote.js';

describe('svelteKitTest plugin', () => {
	test('can import and call remote functions from a .remote.js file', async () => {
		const event = createTestEvent();

		const echo_result = await withRequestContext(event, () => echo('hello'));
		assert.equal(echo_result, 'hello');
	});

	test('transform sets __.name so error messages include function names', () => {
		const event = createTestEvent({ method: 'GET' });

		// commands require a mutative method (POST/PUT/PATCH/DELETE) — calling with
		// GET throws an error that includes the function name
		try {
			withRequestContext(event, () => say_ok());
			assert.fail('should have thrown');
		} catch (e) {
			assert.ok(e instanceof Error);
			// Without the transform, __.name is '' and the error reads:
			//   "Cannot call a command (`()`) from a GET handler"
			// With the transform, the function name is injected:
			//   "Cannot call a command (`say_ok()`) from a GET handler"
			assert.match(e.message, /Cannot call a command \(`say_ok\(\)`\)/);
		}
	});

	test('callRemote handles form submission with valid data', async () => {
		const output = await callRemote(greeting_form, { name: 'Alice' });

		assert.equal(output.submission, true);
		expect(output.result).toEqual({ greeting: 'Hello, Alice!' });
		assert.equal(output.issues, undefined);
	});

	test('callRemote handles form validation failure without throwing', async () => {
		// Forms don't throw on validation failure — they return issues on the output.
		// This matches actual form behavior (inline validation errors in UI).
		const output = await callRemote(greeting_form, { bad: 'data' });

		assert.equal(output.submission, true);
		assert.ok(output.issues);
		assert.ok(output.issues.length > 0);
		assert.equal(output.issues[0].message, 'name is required');
	});
});

describe('auto-context', () => {
	test('allows calling remote functions directly without wrappers', async () => {
		// no withRequestContext or callRemote needed — auto-context handles it
		const result = await echo('hello');
		assert.equal(result, 'hello');
	});

	test('survives multiple remote function calls in the same test', async () => {
		// Two calls are intentional: a single call would pass even if auto-context
		// used sync_store instead of als.enterWith(). The second call catches that
		// because with_request_store's finally block resets sync_store = null,
		// which would leave the second call without context.
		const result1 = await echo('first');
		const result2 = await echo('second');

		assert.equal(result1, 'first');
		assert.equal(result2, 'second');
	});
});

describe('component mode transform', () => {
	const fixture_path = fileURLToPath(new URL('./fixtures/sample.remote.js', import.meta.url));

	test('load generates client stubs matching export names and types', async () => {
		// Cast to any — we're calling plugin hooks directly outside Vite's framework
		const plugin = /** @type {any} */ (svelteKitTest({ mode: 'component' }));

		// Simulate the resolveId → load pipeline:
		// resolveId intercepts the .remote.js import and returns a virtual ID
		const resolved = await plugin.resolveId.call(
			{ resolve: async () => ({ id: fixture_path }) },
			'./sample.remote.js',
			'/some/importer.js',
			{}
		);
		assert.ok(resolved, 'resolveId should return a virtual ID for .remote.js');
		assert.ok(typeof resolved === 'string' && resolved.startsWith('\0'));

		// load reads the original source via the virtual ID and generates client stubs
		const result = plugin.load(resolved);
		assert.ok(result, 'load should return a result for the virtual module');
		const code = result.code;

		// should import from the mock remote runtime
		assert.ok(code.includes("from '__sveltekit/remote'"));

		// should generate stubs for each export with the correct factory
		assert.ok(code.includes('__remote.query('), 'echo should use query factory');
		assert.ok(code.includes('__remote.command('), 'say_ok should use command factory');
		assert.ok(code.includes('__remote.form('), 'greeting_form should use form factory');

		// should NOT contain the original source code (entire file is replaced)
		assert.ok(!code.includes("from '$app/server'"), 'should not contain original imports');
	});

	test('resolveId ignores non-remote files', async () => {
		const plugin = /** @type {any} */ (svelteKitTest({ mode: 'component' }));
		const result = await plugin.resolveId.call(
			{ resolve: async () => ({ id: '/project/src/lib/utils.js' }) },
			'./utils.js',
			'/some/importer.js',
			{}
		);
		assert.equal(result, undefined);
	});
});
