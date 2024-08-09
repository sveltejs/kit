import * as imr from 'import-meta-resolve';
import { pathToFileURL } from 'node:url';

/**
 * Resolve a dependency relative to the current working directory,
 * rather than relative to this package
 * @param {string} dependency
 */
export function resolve_peer_dependency(dependency) {
	const [major, minor] = process.versions.node.split('.').map(Number);
	try {
		const resolved = (() => {
			if (major >= 20 && minor >= 6) {
				// @ts-expect-error the types are wrong
				return import.meta.resolve(dependency);
			}
			// @ts-expect-error the types are wrong
			return imr.resolve(dependency, pathToFileURL(process.cwd() + '/dummy.js'));
		})();
		// @ts-expect-error the types are wrong
		return import(resolved);
	} catch {
		throw new Error(
			`Could not resolve peer dependency "${dependency}" relative to your project — please install it and try again.`
		);
	}
}
