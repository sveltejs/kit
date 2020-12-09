import Root from 'ROOT';
import { pages, ignore, layout } from 'MANIFEST';
import { Router } from './router';
import { Renderer } from './renderer';
import { init, set_paths } from './singletons';

export async function start({ paths, target, session, preloaded, error, status }) {
	const router = new Router({
		base: paths.base,
		pages,
		ignore
	});

	const renderer = new Renderer({
		Root,
		layout,
		target,
		preloaded,
		error,
		status,
		session
	});

	init({ router, renderer });
	set_paths(paths);

	await router.init({ renderer });
}
