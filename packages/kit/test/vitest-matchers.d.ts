import type { DiagnosticOptions } from './diagnostics.js';

declare module 'vitest' {
	// the type parameters must match Vitest's own declaration
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface Matchers<R = void | Promise<void>, T = unknown> {
		/**
		 * Expects a function (or, with `.rejects`, a promise) to throw the diagnostic with this code.
		 * Only list parts of the text that the code under test computes in `options.contains`
		 */
		toThrowKitError(code: string, options?: DiagnosticOptions): R;
		/** Expects an error thrown by the diagnostic with this code */
		toBeKitError(code: string, options?: DiagnosticOptions): R;
		/**
		 * Expects a string, or the calls of a mocked function such as a `console.warn` spy, to contain
		 * the diagnostic with this code
		 */
		toContainKitDiagnostic(code: string, options?: DiagnosticOptions): R;
	}
}
