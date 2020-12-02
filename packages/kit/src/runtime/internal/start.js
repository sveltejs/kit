import Root from 'ROOT';
import { pages, ignore, layout } from 'MANIFEST';
import { Router } from './router';
import { Renderer } from './renderer';
import { init } from './singletons';

export async function start({
	base,
	target,
	session,
	preloaded,
	error,
	status
}) {
	const router = new Router({
		base,
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

	await router.init({ renderer });
}