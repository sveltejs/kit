/** @import { RequestEvent } from '@sveltejs/kit' */
/** @import { RequestState, ServerHooks } from 'types' */
import { expect, test, vi } from 'vitest';
import { init_transport } from '#app/internal/transport';

vi.stubGlobal('__SVELTEKIT_DEV__', false);
vi.stubGlobal('__SVELTEKIT_GLOBAL_NAME__', '__sveltekit_test');
init_transport({});

const { server_data_serializer, server_data_serializer_json } =
	await import('./data_serializer.js');
const { set_hooks } = await import('../internal.js');

const event = /** @type {RequestEvent} */ (/** @type {unknown} */ ({ route: { id: '/a' } }));
const state = /** @type {RequestState} */ (/** @type {unknown} */ ({}));

/** @param {any} data */
function node(data) {
	return /** @type {import('types').ServerDataNode} */ (
		/** @type {unknown} */ ({ type: 'data', data, uses: undefined })
	);
}

test.each([
	['uneval', server_data_serializer],
	['stringify', server_data_serializer_json]
])(
	'explains unserializable load data with %s, keeping the devalue error as the cause',
	(_, create) => {
		const serializer = create(event, state);

		expect(() => serializer.add_node(0, node({ nope: () => {} }))).toThrowKitError(
			'load_not_serializable',
			{ contains: ['/a', 'nope'], cause: expect.any(Error) }
		);
	}
);

test('passes an unserializable promise result to handleError, with the devalue error as its cause', async () => {
	/** @type {unknown[]} */
	const handled = [];
	set_hooks(
		/** @type {ServerHooks} */ (
			/** @type {unknown} */ ({
				handleError: (/** @type {{ error: unknown }} */ { error }) => {
					handled.push(error);
					return { message: 'handled' };
				}
			})
		)
	);

	const serializer = server_data_serializer_json(event, state);
	serializer.add_node(0, node({ promise: Promise.resolve(() => {}) }));

	const { chunks } = serializer.get_data();
	/** @type {string[]} */
	const output = [];
	for await (const chunk of /** @type {AsyncIterable<string>} */ (chunks)) output.push(chunk);

	expect(handled).toHaveLength(1);
	expect(handled[0]).toBeKitError('load_promise_not_serializable', {
		contains: ['/a'],
		cause: expect.any(Error)
	});
	// the client receives the result of `handleError` as the promise's rejection
	expect(output.join('')).toContain('"error"');
	expect(output.join('')).toContain('handled');
});
