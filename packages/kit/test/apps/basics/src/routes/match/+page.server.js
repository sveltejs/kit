import { match } from '$app/paths';
import { testPaths } from './const';

export async function load() {
	const serverResults = await Promise.all(
		testPaths.map(async (path) => ({ path, result: await match(path) }))
	);

	return {
		serverResults
	};
}
