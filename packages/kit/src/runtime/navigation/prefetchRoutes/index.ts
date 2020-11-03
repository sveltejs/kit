import { components, routes } from 'MANIFEST';

export default function prefetchRoutes(pathnames: string[]): Promise<void> {
	const path_routes = 
		pathnames ? routes.filter(route => pathnames.some(pathname => route.pattern.test(pathname))) : routes;

	return path_routes.reduce<Promise<any>>(
		(promise, route) =>
			promise.then(() => Promise.all(route.parts.map(part => part && components[part.i]()))),
		Promise.resolve()
	);
}
