import { json } from '@sveltejs/kit';
import { match } from '$app/paths';

/** @satisfies {import('$app/types').ResolvedPathname[]} */
const valid_paths = ['/path-base/base/', '/path-base/base/resolved/'];

// deliberately not a route so match() returns null
const test_paths = [...valid_paths, '/path-base/not-a-real-route-that-exists/'];

export async function GET() {
	const results = await Promise.all(
		test_paths.map(async (path) => ({ path, result: await match(path) }))
	);

	return json(results);
}
