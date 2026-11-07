/* eslint-disable */
import { match, resolve } from '$app/paths';

// the type check script will see if this is correct
async function _type_test() {
	const result = await match('/routing/matched/0');
	if (result) {
		resolve(result.id, result.params);
		resolve(`${result.id}?query=1`, result.params);
		resolve(`${result.id}#hash`, result.params);
		// @ts-expect-error dynamic routes still require params
		resolve(result.id);
	}
	if (result?.id === '/routing/matched/[number=numeric]') {
		result.params.number === 1;
		// @ts-expect-error
		result.params.number === '1';
		// @ts-expect-error
		result.params.nope === 1;
		resolve(result.id, result.params);
	}
	if (result?.id === '/') {
		resolve(result.id);
		resolve(result.id, result.params);
	}
	if (result && (result.id === '/' || result.id === '/routing')) {
		resolve(result.id);
		resolve(result.id, result.params);
	}
	if (
		result &&
		(result.id === '/routing/matched/[number=numeric]' || result.id === '/routing/[slug]')
	) {
		resolve(result.id, result.params);
		// @ts-expect-error dynamic-only unions still require params
		resolve(result.id);
	}

	resolve('/');
	resolve('/', {});
	resolve('/?query=1', {});
	resolve('/#hash', {});
	// @ts-expect-error static routes only accept empty params
	resolve('/', { nope: 1 });

	resolve('/routing/matched/[number=numeric]', { number: 1 });
	resolve('/routing/matched/[number=numeric]?query=1', { number: 1 });
	resolve('/routing/matched/[number=numeric]#hash', { number: 1 });
	// @ts-expect-error dynamic routes require params
	resolve('/routing/matched/[number=numeric]');
	// @ts-expect-error dynamic routes with a query still require params
	resolve('/routing/matched/[number=numeric]?query=1');
	// @ts-expect-error dynamic routes with a hash still require params
	resolve('/routing/matched/[number=numeric]#hash');
	resolve(
		'/routing/matched/[number=numeric]',
		// @ts-expect-error
		{ nope: 1 }
	);
	resolve(
		'/routing/matched/[number=numeric]',
		// @ts-expect-error
		{ number: '1' }
	);

	resolve('routing');
	resolve('routing?query=1');
	resolve('routing#hash');
	// @ts-expect-error pathnames do not accept params
	resolve('routing', {});
	// @ts-expect-error unknown routes are not accepted
	resolve('/not-a-real-route');

	/** @type {'/' | 'routing'} */
	const static_or_pathname = Math.random() ? '/' : 'routing';
	resolve(static_or_pathname);
	/** @type {'/routing/[slug]' | 'routing'} */
	const dynamic_or_pathname = Math.random() ? '/routing/[slug]' : 'routing';
	resolve(dynamic_or_pathname, { slug: 'hello' });
	// @ts-expect-error a union including dynamic routes still requires params
	resolve(dynamic_or_pathname);
}
_type_test;
