import { error } from '@sveltejs/kit/data';

/** @type {import('@sveltejs/kit').Load} */
export function load({ params }) {
	if (params.item === 'xxx') {
		throw new Error('Params = xxx');
	} else if (param.item === 'yyy') {
		throw error(500, 'Params = yyy');
	} else {
		return {
			page: params.item,
			value: 456
		};
	}

	// TODO check test; old code
	// return {
	// 	stuff: {
	// 		page: params.item,
	// 		value: 456
	// 	},
	// 	error: params.item === 'yyy' ? 'Params = yyy' : undefined
	// };
}
