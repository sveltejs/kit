/**
 * Type tests for @sveltejs/kit/test utilities.
 *
 * These tests validate that the exported functions have correct type inference
 * by assigning results to explicitly typed variables and using @ts-expect-error
 * to confirm that incorrect types are rejected. These have no runtime execution,
 * and are instead are checked by `tsc` as part of `pnpm check`.
 */
import { query, command, form } from '$app/server';
import { callRemote, createTestEvent, withRequestContext } from '@sveltejs/kit/test';
import { StandardSchemaV1 } from '@standard-schema/spec';
import { RequestEvent } from '@sveltejs/kit';

const schema: StandardSchemaV1<{ name: string }> = null as any;

// -----------------------
// --- createTestEvent ---
// -----------------------

function test_createTestEvent() {
	// assert: createTestEvent returns a RequestEvent
	const event: RequestEvent = createTestEvent();
	void event;

	// assert: all options are optional
	createTestEvent({});
	createTestEvent({ url: 'http://localhost/' });
	createTestEvent({ method: 'POST', locals: { foo: 'bar' } });
}
void test_createTestEvent;

// --------------------------
// --- withRequestContext ---
// --------------------------

function test_withRequestContext() {
	const event = createTestEvent();

	// assert: return type matches the callback's return type
	const str: string = withRequestContext(event, () => 'hello');
	void str;

	// assert: return type matches the callback's return type
	const num: number = withRequestContext(event, () => 42);
	void num;

	// assert: mismatched return type is rejected
	// @ts-expect-error
	const wrong: number = withRequestContext(event, () => 'hello');
	void wrong;
}
void test_withRequestContext;

// -------------------------
// --- callRemote: query ---
// -------------------------

async function test_callRemote_query_no_args() {
	const q = query(() => 'hello');

	// assert: output type is inferred from the query handler
	const result: string = await callRemote(q);
	void result;

	// assert: wrong output type is rejected
	// @ts-expect-error
	const wrong: number = await callRemote(q);
	void wrong;
}
void test_callRemote_query_no_args;

async function test_callRemote_query_with_args() {
	const q = query('unchecked', (arg: string) => arg.length);

	// assert: output type is inferred and arg type is enforced
	const result: number = await callRemote(q, 'hello');
	void result;

	// assert: wrong arg type is rejected
	// @ts-expect-error
	await callRemote(q, 123);
}
void test_callRemote_query_with_args;

// ---------------------------
// --- callRemote: command ---
// ---------------------------

async function test_callRemote_command_no_args() {
	const c = command(() => 42);

	// assert: output type is inferred from the command handler
	const result: number = await callRemote(c);
	void result;

	// assert: wrong output type is rejected
	// @ts-expect-error
	const wrong: string = await callRemote(c);
	void wrong;
}
void test_callRemote_command_no_args;

async function test_callRemote_command_with_args() {
	const c = command('unchecked', (arg: { n: number }) => arg.n * 2);

	// assert: output type is inferred and arg type is enforced
	const result: number = await callRemote(c, { n: 5 });
	void result;

	// assert: wrong arg type is rejected
	// @ts-expect-error
	await callRemote(c, 'wrong');
}
void test_callRemote_command_with_args;

// ------------------------
// --- callRemote: form ---
// ------------------------

async function test_callRemote_form() {
	const f = form(schema, (data) => ({ greeting: `Hello, ${data.name}!` }));
	const output = await callRemote(f, { name: 'Alice' });

	// assert: submission is always true
	const sub: true = output.submission;
	void sub;

	// assert: result type is inferred from the form handler (optional — undefined when validation fails)
	if (output.result) {
		const greeting: string = output.result.greeting;
		void greeting;
	}

	// assert: issues are typed as RemoteFormIssue[] (optional — present when validation fails)
	if (output.issues) {
		const message: string = output.issues[0].message;
		void message;
	}
}
void test_callRemote_form;
