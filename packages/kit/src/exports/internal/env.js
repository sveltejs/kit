/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { EnvVarConfig } from '@sveltejs/kit/env' */

import * as e from '../../messages/server-errors.js';
import { bullet_list } from '../../utils/format.js';

export const MISSING = {
	message: `Value is missing. If it is optional, add a validator declaring it as such.`
};

export const BAD_VALIDATOR = {
	message: 'Variable was configured with a validator that does not implement Standard Schema'
};

export const ASYNC_VALIDATOR = {
	message: 'Variable uses an async validator, which is not supported'
};

/**
 * @param {Record<string, EnvVarConfig<any> | undefined>} variables
 * @param {string | undefined} value
 * @param {string} name
 * @param {Record<string, StandardSchemaV1.Issue[]>} issues
 * @returns
 */
export function validate(variables, value, name, issues) {
	const config = variables[name] ?? {};
	// `defineEnvVars` normalizes function validators to standard schemas
	const validator = /** @type {StandardSchemaV1<string | undefined, any> | undefined} */ (
		config.schema
	);

	if (!validator) {
		if (value === undefined) issues[name] = [MISSING];
		return value;
	}

	if (!validator['~standard']) {
		issues[name] = [BAD_VALIDATOR];
		return;
	}

	const result = validator['~standard'].validate(value);

	if (result instanceof Promise) {
		issues[name] = [ASYNC_VALIDATOR];
		return;
	}

	if (result.issues) {
		issues[name] = [...result.issues];
		return;
	}

	return result.value;
}

/**
 * @param {Record<string, StandardSchemaV1.Issue[]>} issues
 */
export function handle_issues(issues) {
	const entries = Object.entries(issues);

	if (entries.length === 0) {
		return;
	}

	const list = entries
		.map(([name, issues]) => `${name}\n${bullet_list(issues.map((issue) => issue.message))}`)
		.join('\n\n');

	// the stack would only point into SvelteKit's generated modules
	e.env_invalid({ issues: `\n${list}\n` }, { stackless: true });
}
