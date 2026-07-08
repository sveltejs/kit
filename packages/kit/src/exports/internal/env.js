/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
/** @import { EnvVarConfig } from '@sveltejs/kit' */

import { stackless } from '../../utils/error.js';

const MISSING = {
	message: `Value is missing. If it is optional, add a Standard Schema validator declaring it as such.`
};

const BAD_VALIDATOR = {
	message: 'Variable was configured with a validator that does not implement Standard Schema'
};

const ASYNC_VALIDATOR = {
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
	const validator = config.schema;

	if (!validator) {
		if (!value) issues[name] = [MISSING];
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

	let message = 'Invalid environment variables\n';

	for (const [name, issues] of entries) {
		message += `\n${name}\n${issues.map((issue) => `  - ${issue.message}`).join('\n')}\n`;
	}

	throw stackless(message);
}
