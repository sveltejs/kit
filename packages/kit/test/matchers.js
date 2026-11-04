// Registers Vitest matchers for diagnostics. This module is one of the `setupFiles` of each Vitest
// config that runs Kit tests, and their types are declared in `./vitest-matchers.d.ts`, which is
// included by the corresponding tsconfig files
import { expect } from 'vitest';
import { check_error, check_output } from './diagnostics.js';

/**
 * @param {import('vitest').MatcherState} state
 * @param {unknown} received
 * @param {string | null} problem
 */
function result(state, received, problem) {
	return {
		pass: problem === null,
		message: () =>
			state.isNot
				? 'expected the diagnostic not to match'
				: `${problem}, but received ${state.utils.printReceived(received)}`
	};
}

/**
 * Like `check_error`, but also compares `options.cause`, using Vitest's equality so that it can be
 * an asymmetric matcher
 * @param {import('vitest').MatcherState} state
 * @param {unknown} error
 * @param {string} code
 * @param {import('./diagnostics.js').DiagnosticOptions} [options]
 */
function check_kit_error(state, error, code, options = {}) {
	const problem = check_error(error, code, options);
	if (problem || !('cause' in options)) return problem;

	const cause = /** @type {Error} */ (error).cause;
	return state.equals(cause, options.cause)
		? null
		: `expected the cause of ${code} to equal ${state.utils.printExpected(options.cause)}, but it was ${state.utils.printReceived(cause)}`;
}

/**
 * Returns the text of a string, or of every call of a mocked function such as a `console.warn` spy
 * @param {unknown} received
 */
function to_output(received) {
	if (typeof received === 'string') return received;

	const calls = /** @type {{ mock?: { calls: unknown[][] } }} */ (received)?.mock?.calls;
	if (calls) return calls.map((args) => args.map(String).join('\n')).join('\n');

	return String(received);
}

expect.extend({
	toThrowKitError(received, code, options) {
		let thrown = received;

		// with `.rejects`, `received` is the rejection reason rather than a function
		if (typeof received === 'function' && !this.promise) {
			thrown = undefined;
			try {
				received();
			} catch (error) {
				thrown = error;
			}
		}

		return result(this, thrown, check_kit_error(this, thrown, code, options));
	},

	toBeKitError(received, code, options) {
		return result(this, received, check_kit_error(this, received, code, options));
	},

	toContainKitDiagnostic(received, code, options) {
		const output = to_output(received);
		return result(this, output, check_output(output, code, options));
	}
});
