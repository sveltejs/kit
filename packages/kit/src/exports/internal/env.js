/** @import { EnvVarConfig } from '@sveltejs/kit' */

/**
 *
 * @param {Record<string, EnvVarConfig<any>>} variables
 * @param {string | undefined} value
 * @param {string} name
 * @returns
 */
export function validate(variables, value, name) {
	const config = variables[name] ?? {};
	const validator = config.validate;

	if (!validator) {
		if (!value) {
			throw new Error(
				`Environment variable ${name} was not set. If it is optional, add a Standard Schema validator declaring it as such.`
			);
		}

		return;
	}

	if (!validator['~standard']) {
		throw new Error(
			`Environment variable ${name} was configured with a validator that does not implement Standard Schema`
		);
	}

	const result = validator['~standard'].validate(value);

	if (result instanceof Promise) {
		throw new Error(`Environment variable ${name} uses an async validator, which is not supported`);
	}

	if (result.issues) {
		throw new Error(
			`Environment variable ${name} is invalid: \${result.issues.map((issue) => issue.message).join(', ')}`
		);
	}

	return result.value;
}
