/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { InternalRemoteFormIssue } from 'types' */
import { ValidationError } from '@sveltejs/kit/internal';
import { create_issues, normalize_issue } from '../../form-utils.js';

/**
 * The property under which the internals of a universal function are stored.
 * The Vite plugin (`plugin_universal`) writes `id` and `name` into it after the module was evaluated.
 * It's a string key (not a symbol) so that the generated code doesn't need to import anything.
 */
export const UNIVERSAL = '__universal';

/**
 * The search param used for non-enhanced (no-JS) universal form submissions
 */
export const UNIVERSAL_ACTION_PARAM = '/universal';

/**
 * @typedef {{
 *   type: 'query' | 'query_batch' | 'query_live' | 'command' | 'form';
 *   id: string;
 *   name: string;
 * }} UniversalInternals
 */

/**
 * @typedef {{
 *   issues?: InternalRemoteFormIssue[];
 *   input?: Record<string, any>;
 *   result?: any;
 * }} UniversalFormOutput
 */

/**
 * @param {UniversalInternals['type']} type
 * @returns {UniversalInternals}
 */
export function create_internals(type) {
	return { type, id: '', name: '' };
}

/**
 * Attaches the internals to a universal function/object, so that the Vite plugin can assign an id
 * @template {object} T
 * @param {T} target
 * @param {UniversalInternals} internals
 * @returns {T}
 */
export function attach_internals(target, internals) {
	Object.defineProperty(target, UNIVERSAL, { value: internals });
	return target;
}

/**
 * Validates the form data with the (optional) schema, then runs the user-provided handler.
 * This is the same on the server (non-enhanced submissions) and the client (enhanced submissions).
 *
 * @param {StandardSchemaV1 | null} schema
 * @param {(...args: any[]) => any} fn
 * @param {boolean} has_data whether `fn` receives the data (i.e. `form(schema | 'unchecked', fn)`) or not (`form(fn)`)
 * @param {Record<string, any>} data
 * @param {boolean} server whether this runs on the server
 * @returns {Promise<UniversalFormOutput>}
 */
export async function run_form_handler(schema, fn, has_data, data, server) {
	/** @type {UniversalFormOutput} */
	const output = {};

	const validated = await schema?.['~standard'].validate(data);

	if (validated?.issues !== undefined) {
		output.issues = validated.issues.map((issue) => normalize_issue(issue, server));
		return output;
	}

	if (validated !== undefined) {
		data = /** @type {Record<string, any>} */ (validated.value);
	}

	try {
		output.result = await (has_data ? fn(data, create_issues()) : fn());
	} catch (error) {
		if (error instanceof ValidationError) {
			output.issues = error.issues.map((issue) => normalize_issue(issue, server));
		} else {
			throw error;
		}
	}

	return output;
}

/**
 * Strips sensitive (underscore-prefixed) fields and files from form input,
 * so that it can be safely serialized back to the client after a failed non-enhanced submission
 * @param {Record<string, any>} input
 * @returns {Record<string, any>}
 */
export function redact_input(input) {
	/** @type {Record<string, any>} */
	const result = Array.isArray(input) ? /** @type {any} */ ([]) : {};

	for (const key in input) {
		if (key.startsWith('_')) continue;

		const value = input[key];
		if (typeof File !== 'undefined' && value instanceof File) continue;

		result[key] = value !== null && typeof value === 'object' ? redact_input(value) : value;
	}

	return result;
}

/**
 * Returns the id under which a (possibly keyed, via `.for(key)`) form instance
 * is identified in the `action` attribute and in the serialized data
 * @param {string} id
 * @param {any} key
 */
export function get_form_action_id(id, key) {
	return key === undefined ? id : `${id}/${JSON.stringify(key)}`;
}
