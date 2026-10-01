// Assertions for diagnostics generated from `packages/kit/messages`. A diagnostic's code is
// stable, but its text can be reworded at any time, so tests should check the code and, at most,
// values that the code under test computes (such as a config keypath or a missing parameter).
// This module has no dependencies, so that both the Vitest matchers in `./matchers.js` and the
// Playwright `expect` in `./utils.js` can build on it

/** @param {string} code */
export function diagnostic_url(code) {
	return `https://next.svelte.dev/e/kit/${code}`;
}

/**
 * @typedef {{
 *   contains?: string | RegExp | Array<string | RegExp>;
 *   url_only?: boolean;
 *   stackless?: boolean;
 *   cause?: unknown;
 * }} DiagnosticOptions
 * - `contains`: parts of the text that the code under test computes. Don't list static wording
 * - `url_only`: expect a production diagnostic that only contains the URL
 * - `stackless`: `true` expects an empty stack, `false` a non-empty one. Only applies to errors
 * - `cause`: the expected `error.cause`, which can be an asymmetric matcher such as
 *   `expect.objectContaining(...)`. Only supported by the Vitest matchers
 */

/**
 * Removes terminal colours and the `console.warn` styling of runtime warnings
 * @param {string} output
 */
function normalize(output) {
	// eslint-disable-next-line no-control-regex
	return output.replace(/\u001b\[[0-9;]*m/g, '').replace(/%c(\[sveltekit\] )?/g, '');
}

/** @param {string} string */
function escape(string) {
	return string.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/**
 * Finds the diagnostic with the given code in some output, such as an error message, a logged
 * warning or a build's stderr. Returns its text, `''` for a production diagnostic that only
 * contains the URL, or `null` if the output doesn't contain the diagnostic
 * @param {string} output
 * @param {string} code
 * @returns {string | null}
 */
export function find_diagnostic(output, code) {
	const normalized = normalize(output);
	const url = escape(diagnostic_url(code));
	// the diagnostic may be embedded in other output, such as an error page or a build log
	const match = new RegExp(`(?<!\\w)${code}\\n([^]*?)\\n${url}(?![\\w/])`).exec(normalized);

	if (match) return match[1];
	if (new RegExp(`${url}(?![\\w/])`).test(normalized)) return '';
	return null;
}

/**
 * @param {string} output
 * @param {string} code
 * @param {DiagnosticOptions} [options]
 * @returns {string | null} A description of the problem, or `null` if the output matches
 */
export function check_output(output, code, options = {}) {
	const text = find_diagnostic(output, code);

	if (text === null) return `expected output to contain the ${code} diagnostic`;
	if (options.url_only) {
		return text === '' ? null : `expected ${code} to only contain its URL, but it has text`;
	}
	if (text === '') return `expected ${code} to have text, but it only contains its URL`;

	for (const part of Array.isArray(options.contains)
		? options.contains
		: options.contains
			? [options.contains]
			: []) {
		if (typeof part === 'string' ? !text.includes(part) : !part.test(text)) {
			return `expected the text of ${code} to contain ${part}`;
		}
	}

	return null;
}

/**
 * Checks that `error` is the error thrown by a generated diagnostic helper
 * @param {unknown} error
 * @param {string} code
 * @param {DiagnosticOptions} [options]
 * @returns {string | null} A description of the problem, or `null` if the error matches
 */
export function check_error(error, code, options = {}) {
	if (!(error instanceof Error) || Object.getPrototypeOf(error) !== Error.prototype) {
		return `expected a plain Error with the ${code} diagnostic`;
	}

	if (options.url_only) {
		if (error.name !== 'Error' || error.message !== diagnostic_url(code)) {
			return `expected an Error whose message is the URL of ${code}`;
		}
		return null;
	}

	if (options.stackless !== undefined && (error.stack === '') !== options.stackless) {
		return `expected ${code} ${options.stackless ? 'not ' : ''}to have a stack trace`;
	}

	if (error.name !== 'SvelteKit error') return `expected a 'SvelteKit error' with ${code}`;
	if (!error.message.startsWith(`${code}\n`) || !error.message.endsWith(diagnostic_url(code))) {
		return `expected the message to be the ${code} diagnostic`;
	}

	return check_output(error.message, code, options);
}
