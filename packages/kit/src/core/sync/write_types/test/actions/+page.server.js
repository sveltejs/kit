import { fail } from '../../../../../../types/internal.js';

let condition = false;

export const actions = {
	default: () => {
		if (condition) {
			return fail(400, { fail: 'oops' });
		}

		return {
			success: true
		};
	}
};

/** @type {import('./.svelte-kit/types/src/core/sync/write_types/test/actions/$types').SubmitFunction} */
const submit = () => {
	return ({ result }) => {
		if (result.type === 'success') {
			result.data?.success === true;
			// @ts-expect-error should be of type `boolean`
			result.data?.success === 'success';
			// @ts-expect-error unknown property
			result.data?.something;
		}
		if (result.type === 'failure') {
			result.data?.fail === '';
			// @ts-expect-error should be of type `string`
			result.data?.fail === 1;
			// @ts-expect-error unknown property
			result.data?.unknown;
		}
	};
};
