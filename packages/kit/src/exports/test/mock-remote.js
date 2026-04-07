import { getOrCreateMock } from './mock-registry.js';

/**
 * Registers mock data for a remote function in component tests.
 * The mock is keyed by the function's ID and read by the mock
 * remote runtime during component rendering.
 *
 * Methods are chainable — call multiple to build up the mock state:
 *
 * @example
 * ```js
 * import { mockRemote } from '@sveltejs/kit/test';
 * import { getUser } from './data.remote.ts';
 * import { myForm } from './form.remote.ts';
 *
 * // Query/command — set return data
 * mockRemote(getUser).returns({ name: 'Alice' });
 *
 * // Form — set result, field values, and validation issues
 * mockRemote(myForm)
 *   .returns({ success: true })
 *   .withFieldValues({ email: 'alice@example.com' })
 *   .withFieldIssues({ name: [{ message: 'Required' }] });
 * ```
 *
 * @param {any} fn The remote function to mock (imported from a .remote.ts file)
 */
export function mockRemote(fn) {
	const id = fn?.__mock_id ?? fn?.__?.id;
	if (!id) {
		throw new Error(
			'mockRemote: argument is not a remote function (no ID found). ' +
				'Make sure you are importing from a .remote.ts file with the svelteKitTest({ mode: "component" }) plugin active.'
		);
	}

	const config = getOrCreateMock(id);

	const builder = {
		/**
		 * Mock the function to return this data when called (or set form result)
		 * @param {any} data
		 * @param {{ delay?: number }} [options]
		 */
		returns(data, options) {
			config.data = data;
			if (options?.delay) config.delay = options.delay;
			return builder;
		},
		/**
		 * Mock the function to throw an HttpError with this status and body
		 * @param {number} status
		 * @param {any} body
		 * @param {{ delay?: number }} [options]
		 */
		throws(status, body, options) {
			config.error = { status, body };
			if (options?.delay) config.delay = options.delay;
			return builder;
		},
		/**
		 * Mock the function to call this resolver with the argument
		 * @param {(arg: any) => any} fn
		 * @param {{ delay?: number }} [options]
		 */
		resolves(fn, options) {
			config.resolver = fn;
			if (options?.delay) config.delay = options.delay;
			return builder;
		},
		/**
		 * Set form field values (for pre-populated forms or edit scenarios)
		 * @param {Record<string, any>} values
		 */
		withFieldValues(values) {
			config.fieldValues = values;
			return builder;
		},
		/**
		 * Set form field validation issues
		 * @param {Record<string, Array<{ message: string, path?: Array<string | number> }>>} issues
		 */
		withFieldIssues(issues) {
			config.fieldIssues = issues;
			return builder;
		}
	};

	return builder;
}
