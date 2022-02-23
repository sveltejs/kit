/**
 * Takes zero or more objects and returns a new object that has all the values
 * deeply merged together. None of the original objects will be mutated at any
 * level, and the returned object will have no references to the original
 * objects at any depth. If there's a conflict the last one wins, except for
 * arrays which will be combined.
 * @param {...Object} objects
 * @returns {[Record<string, any>, string[]]} a 2-tuple with the merged object,
 *     and a list of merge conflicts if there were any, in dotted notation
 */
export function deep_merge(...objects) {
	const result = {};
	/** @type {string[]} */
	const conflicts = [];
	objects.forEach((o) => merge_into(result, o, conflicts));
	return [result, conflicts];
}

/**
 * normalize kit.vite.resolve.alias as an array
 * @param {import('vite').AliasOptions} o
 * @returns {import('vite').Alias[]}
 */
export function normalize_alias(o) {
	if (Array.isArray(o)) return o;
	return Object.entries(o).map(([find, replacement]) => ({ find, replacement }));
}

/**
 * mutates and remove keys from an object when check callback returns true
 * @param {Record<string, any>} o any object
 * @param {([key, value]: [string, any]) => boolean} check callback with access
 * 		to the key-value pair and returns a boolean that decides the deletion of key
 */
export function remove_keys(o, check) {
	for (const key in o) {
		if (!Object.hasOwnProperty.call(o, key)) continue;
		if (check([key, o[key]])) delete o[key];
		const nested = typeof o[key] === 'object' && !Array.isArray(o[key]);
		if (nested) remove_keys(o[key], check);
	}
}

/**
 * Merges b into a, recursively, mutating a.
 * @param {Record<string, any>} a
 * @param {Record<string, any>} b
 * @param {string[]} conflicts array to accumulate conflicts in
 * @param {string[]} path array of property names representing the current
 *     location in the tree
 */
function merge_into(a, b, conflicts = [], path = []) {
	/**
	 * Checks for "plain old Javascript object", typically made as an object
	 * literal. Excludes Arrays and built-in types like Buffer.
	 * @param {any} x
	 */
	const is_plain_object = (x) => typeof x === 'object' && x.constructor === Object;

	for (const prop in b) {
		// normalize alias objects to array
		if (prop === 'alias' && path[path.length - 1] === 'resolve') {
			if (a[prop]) a[prop] = normalize_alias(a[prop]);
			if (b[prop]) b[prop] = normalize_alias(b[prop]);
		}

		if (is_plain_object(b[prop])) {
			if (!is_plain_object(a[prop])) {
				if (a[prop] !== undefined) {
					conflicts.push([...path, prop].join('.'));
				}
				a[prop] = {};
			}
			merge_into(a[prop], b[prop], conflicts, [...path, prop]);
		} else if (Array.isArray(b[prop])) {
			if (!Array.isArray(a[prop])) {
				if (a[prop] !== undefined) {
					conflicts.push([...path, prop].join('.'));
				}
				a[prop] = [];
			}
			a[prop].push(...b[prop]);
		} else {
			// Since we're inside a for/in loop which loops over enumerable
			// properties only, we want parity here and to check if 'a' has
			// enumerable-only property 'prop'. Using 'hasOwnProperty' to
			// exclude inherited properties is close enough. It is possible
			// that someone uses Object.defineProperty to create a direct,
			// non-enumerable property but let's not worry about that.
			if (Object.prototype.hasOwnProperty.call(a, prop)) {
				conflicts.push([...path, prop].join('.'));
			}
			a[prop] = b[prop];
		}
	}
}

export function enumerate_error_props(error) {
	const seen = new Map();
	const replacements = new Set();

	function loop(error) {
		const { name, message, stack } = error;
		const obj = { ...error, name, message, stack };

		for (const [key, val] of Object.entries(obj)) {
			if (val instanceof Error) {
				if (seen.has(val)) {
					// Store a reference so the error can be replaced with an
					// enumerated object once recursion is complete.
					replacements.add({ obj, key, error: val });
				} else {
					// Set a placeholder to prevent infinite recursion.
					seen.set(val, 'placeholder');

					// Recurse into the error.
					const enumerated = loop(val);

					// Overwrite the placeholder with the enumerated error object.
					seen.set(val, enumerated);
					obj[key] = enumerated;
				}
			}
		}

		return obj;
	}

	const output = loop(error);

	for (const item of replacements) {
		const { obj, key, error } = item;
		const enumerated = seen.get(error);
		if (enumerated) {
			obj[key] = enumerated;
		}
	}

	return output;
}

// Something like https://github.com/moll/json-stringify-safe. Similar to
// devalue, but intentionaly *breaks* circular references so the object can be
// serialized to JSON
export function stringify_safe(obj) {
	const stack = [];
	const keys = [];
	const cycleReplacer = function (key, value) {
		if (stack[0] === value) return '[Circular ~]';
		return '[Circular ~.' + keys.slice(0, stack.indexOf(value)).join('.') + ']';
	};

	return JSON.stringify(obj, function (key, value) {
		if (stack.length > 0) {
			const thisPos = stack.indexOf(this);
			~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
			~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
			if (~stack.indexOf(value)) value = cycleReplacer.call(this, key, value);
		} else stack.push(value);

		return value;
	});
}
