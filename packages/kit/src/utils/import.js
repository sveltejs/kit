import { resolveModuleURL } from 'exsolve';

/**
 * Resolve a dependency relative to the current working directory,
 * rather than relative to this package (but falls back to trying that, if necessary)
 * @param {string} dependency
 */
export async function resolve_peer_dependency(dependency) {
	try {
		const resolved = resolveModuleURL(dependency);
		return await import(resolved);
	} catch {
		try {
			// both imr.resolve and await import above can throw, which is why we can't just do import(resolved).catch(...) above
			return await import(dependency);
		} catch {
			throw new Error(
				`Could not resolve peer dependency "${dependency}" relative to your project — please install it and try again.`
			);
		}
	}
}
