import * as imr from 'import-meta-resolve';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

/**
 * Resolve a dependency relative to the current working directory,
 * rather than relative to this package (but falls back to trying that, if necessary)
 * @param {string} dependency
 */
export async function resolve_peer_dependency(dependency) {
	try {
		// @ts-expect-error the types are wrong
		const resolved = imr.resolve(dependency, pathToFileURL(process.cwd() + '/dummy.js'));
		return await import(resolved).catch(() => import(dependency));
	} catch {
		throw new Error(
			`Could not resolve peer dependency "${dependency}" relative to your project — please install it and try again.`
		);
	}
}
