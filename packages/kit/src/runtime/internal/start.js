import Root from 'ROOT'; // eslint-disable-line import/no-unresolved
import { pages, ignore, layout } from 'MANIFEST'; // eslint-disable-line import/no-unresolved
import { Router } from './router';
import { Renderer } from './renderer';
import { init, set_paths } from './singletons';

/** @param {{
 *   paths: {
 *     assets: string;
 *     base: string;
 *   },
 *   target: Node;
 *   host: string;
 *   session: any;
 *   error: Error;
 *   status: number;
 * }} opts */
export async function start({ paths, target, host, session, error, status }) {
	const router = new Router({
		base: paths.base,
		host,
		pages,
		ignore
	});

	const renderer = new Renderer({
		Root,
		layout,
		target,
		error,
		status,
		session
	});

	init({ router, renderer });
	set_paths(paths);

	await router.init(renderer);
}
