import { components, routes } from 'MANIFEST';

export default async function prefetchRoutes(pathnames: string[]): Promise<void> {
	const path_routes = pathnames
		? routes.filter((route) => pathnames.some((pathname) => route.pattern.test(pathname)))
		: routes;

	const promises = path_routes.map((r) => Promise.all(r.parts.map((p) => p && components[p.i]())));

	await Promise.all(promises);
}
