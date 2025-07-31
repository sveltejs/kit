/** @import { RemoteCommand } from '@sveltejs/kit' */
/** @import { RemoteInfo, MaybePromise } from 'types' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import { getRequestEvent } from '../event.js';
import { check_experimental, create_validator, run_remote_function } from './shared.js';
import { get_event_state } from '../../../server/event-state.js';

/**
 * Creates a remote command. When called from the browser, the function will be invoked on the server via a `fetch` call.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#command) for full documentation.
 *
 * @template Output
 * @overload
 * @param {() => Output} fn
 * @returns {RemoteCommand<void, Output>}
 * @since 2.27
 */
/**
 * Creates a remote command. When called from the browser, the function will be invoked on the server via a `fetch` call.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#command) for full documentation.
 *
 * @template Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(arg: Input) => Output} fn
 * @returns {RemoteCommand<Input, Output>}
 * @since 2.27
 */
/**
 * Creates a remote command. When called from the browser, the function will be invoked on the server via a `fetch` call.
 *
 * See [Remote functions](https://svelte.dev/docs/kit/remote-functions#command) for full documentation.
 *
 * @template {StandardSchemaV1} Schema
 * @template Output
 * @overload
 * @param {Schema} validate
 * @param {(arg: StandardSchemaV1.InferOutput<Schema>) => Output} fn
 * @returns {RemoteCommand<StandardSchemaV1.InferOutput<Schema>, Output>}
 * @since 2.27
 */
/**
 * @template Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {(arg?: Input) => Output} [maybe_fn]
 * @returns {RemoteCommand<Input, Output>}
 * @since 2.27
 */
/*@__NO_SIDE_EFFECTS__*/
export function command(validate_or_fn, maybe_fn) {
	check_experimental('command');

	/** @type {(arg?: Input) => Output} */
	const fn = maybe_fn ?? validate_or_fn;

	/** @type {(arg?: any) => MaybePromise<Input>} */
	const validate = create_validator(validate_or_fn, maybe_fn);

	/** @type {RemoteInfo} */
	const __ = { type: 'command', id: '', name: '' };

	/** @type {RemoteCommand<Input, Output> & { __: RemoteInfo }} */
	const wrapper = (arg) => {
		const event = getRequestEvent();

		if (!event.isRemoteRequest) {
			throw new Error(
				`Cannot call a command (\`${__.name}(${maybe_fn ? '...' : ''})\`) during server-side rendering`
			);
		}

		get_event_state(event).refreshes ??= {};

		const promise = Promise.resolve(run_remote_function(event, true, arg, validate, fn));

		// @ts-expect-error
		promise.updates = () => {
			throw new Error(`Cannot call '${__.name}(...).updates(...)' on the server`);
		};

		return /** @type {ReturnType<RemoteCommand<Input, Output>>} */ (promise);
	};

	Object.defineProperty(wrapper, '__', { value: __ });

	return wrapper;
}
