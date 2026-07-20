/* eslint-disable */
import { match, resolve } from '$app/paths';

// the type check script will see if this is correct
async function _type_test() {
	const result = await match('/routing/matched/0');
	if (result?.id === '/routing/matched/[number=numeric]') {
		result.params.number === 1;
		// @ts-expect-error
		result.params.number === '1';
		// @ts-expect-error
		result.params.nope === 1;
	}

	resolve('/routing/matched/[number=numeric]', { number: 1 });
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
}
_type_test;
