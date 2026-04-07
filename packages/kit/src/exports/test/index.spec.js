import { assert, expect, test, describe } from 'vitest';
import {
	createTestEvent,
	withRequestContext,
	callRemote,
	setLocals,
	HttpValidationError
} from './index.js';
import { getRequestEvent } from '@sveltejs/kit/internal/server';
import { query } from '../../runtime/app/server/remote/query.js';
import { command } from '../../runtime/app/server/remote/command.js';
import { HttpError } from '@sveltejs/kit/internal';

describe('createTestEvent', () => {
	test('produces a valid RequestEvent with defaults', () => {
		const event = createTestEvent();

		assert.ok(event.url instanceof URL);
		assert.equal(event.url.href, 'http://localhost/');
		assert.equal(event.request.method, 'GET');
		assert.equal(event.isDataRequest, false);
		assert.equal(event.isSubRequest, false);
		assert.equal(event.isRemoteRequest, false);
		assert.equal(event.route.id, '/');
		assert.equal(typeof event.getClientAddress, 'function');
		assert.equal(event.getClientAddress(), '127.0.0.1');
		assert.equal(typeof event.setHeaders, 'function');
		assert.equal(typeof event.fetch, 'function');
		assert.ok(event.cookies);
		assert.ok(event.tracing);
		assert.equal(event.tracing.enabled, false);
	});

	test('applies custom options', () => {
		const event = createTestEvent({
			url: 'http://example.com/blog/hello',
			method: 'POST',
			locals: { user: { id: '123' } },
			params: { slug: 'hello' },
			cookies: { session: 'abc' },
			routeId: '/blog/[slug]'
		});

		assert.equal(event.url.pathname, '/blog/hello');
		assert.equal(event.request.method, 'POST');
		expect(event.locals).toEqual({ user: { id: '123' } });
		expect(event.params).toEqual({ slug: 'hello' });
		assert.equal(event.cookies.get('session'), 'abc');
		assert.equal(event.route.id, '/blog/[slug]');
	});
});

describe('withRequestContext', () => {
	test('overrides auto-context with custom event', () => {
		// auto-context provides a default event (empty locals)
		// withRequestContext should use our custom event instead
		const event = createTestEvent({ locals: { test_value: 42 } });

		const result = withRequestContext(event, () => {
			const req = getRequestEvent();
			return req.locals;
		});

		expect(result).toEqual({ test_value: 42 });
	});

	test('propagates return value', () => {
		const event = createTestEvent();

		const result = withRequestContext(event, () => 'hello from test');

		assert.equal(result, 'hello from test');
	});

	test('works with async', async () => {
		const event = createTestEvent({ locals: { async_test: true } });

		const result = await withRequestContext(event, async () => {
			await new Promise((resolve) => setTimeout(resolve, 1));
			const req = getRequestEvent();
			return req.locals;
		});

		expect(result).toEqual({ async_test: true });
	});

	test('surfaces validation errors from schema-validated remote functions', async () => {
		// avoid a dev dependency on a validation library
		const schema = /** @type {import('@standard-schema/spec').StandardSchemaV1<string>} */ ({
			'~standard': {
				validate: (/** @type {unknown} */ value) => {
					if (typeof value !== 'string') {
						return { issues: [{ message: 'Expected a string' }] };
					}
					return { value };
				}
			}
		});

		const validated_query = query(schema, (arg) => {
			return arg.toUpperCase();
		});

		const event = createTestEvent();

		// valid input succeeds
		const result = await withRequestContext(event, () => validated_query('hello'));
		assert.equal(result, 'HELLO');

		// invalid input throws an HttpValidationError with status 400 and typed issues
		try {
			await withRequestContext(event, () => validated_query(/** @type {any} */ (123)));
			assert.fail('should have thrown');
		} catch (e) {
			// HttpValidationError extends HttpError, so both checks pass
			assert.ok(e instanceof HttpValidationError);
			assert.ok(e instanceof HttpError);
			assert.equal(e.status, 400);
			assert.equal(e.body.message, 'Bad Request');
			expect(e.issues).toEqual([{ message: 'Expected a string' }]);
		}
	});
});

describe('callRemote', () => {
	test('auto-detects GET for queries', async () => {
		const my_query = query('unchecked', (/** @type {string} */ val) => val.toUpperCase());
		const result = await callRemote(my_query, 'hello');
		assert.equal(result, 'HELLO');
	});

	test('auto-detects POST for commands', async () => {
		const my_command = command('unchecked', (/** @type {number} */ n) => n * 2);
		const result = await callRemote(my_command, 5);
		assert.equal(result, 10);
	});
});

describe('setLocals', () => {
	test('modifies the current request context event', () => {
		const event = createTestEvent();
		withRequestContext(event, () => {
			setLocals({ custom_value: 'from setLocals' });
			expect(getRequestEvent().locals).toEqual({ custom_value: 'from setLocals' });
		});
	});
});
