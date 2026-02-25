/**
 * read process.env[name] and convert to number
 *
 * @param {string} name of process.env value to read
 * @param {number|undefined} default_value
 * @return {number|undefined} number or default_value if process.env[name] isn't set
 * @throws {Error} when value cannot be parsed to number
 */
export function number_from_env(name, default_value) {
	const val = process.env[name];
	if(val!= null) {
		const num = Number(val);
		if(isNaN(num)){
			throw new Error(`process.env.${name} must be parsable to a number but is "${val}"`);
		}
		return num;
	}
	return default_value
}
