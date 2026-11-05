// Playwright equivalents of the diagnostic matchers in `./matchers.js`
import { expect as base } from '@playwright/test';
import { check_output } from './diagnostics.js';

export const expect = base.extend({
	/**
	 * Expects a string, such as an error page's text or a server's output, to contain the
	 * diagnostic with this code. Only list parts of the text that the code under test computes
	 * @param {unknown} received
	 * @param {string} code
	 * @param {import('./diagnostics.js').DiagnosticOptions} [options]
	 */
	toContainKitDiagnostic(received, code, options) {
		const output = String(received);
		const problem = check_output(output, code, options);

		return {
			pass: problem === null,
			name: 'toContainKitDiagnostic',
			message: () =>
				this.isNot
					? `expected ${JSON.stringify(output)} not to contain the ${code} diagnostic`
					: `${problem}, but received ${JSON.stringify(output)}`
		};
	}
});
