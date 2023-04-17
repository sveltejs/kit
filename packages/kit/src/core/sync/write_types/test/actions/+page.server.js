import { fail } from '../../../../../../types/internal.js';

let condition = false;

export const actions = {
	default: () => {
		if (condition) {
			return fail(400, {
				fail: 'oops'
			});
		}

		return {
			success: true
		};
	},
	successWithPayload: () => {
		return {
			id: 42,
			username: 'John Doe',
			profession: 'Svelte specialist'
		};
	},
	successWithoutPayload: () => {},
	failWithPayload: () => {
		return fail(400, {
			reason: {
				error: {
					code: /** @type {const} */ ('VALIDATION_FAILED')
				}
			}
		});
	},
	failWithoutPayload: () => {
		return fail(400);
	}
};

/** @type {import('./.svelte-kit/types/src/core/sync/write_types/test/actions/$types').SubmitFunction} */
const submit = () => {
	return ({ result }) => {
		if (result.type === 'success') {
			// @ts-expect-error does only exist on `failure` result
			result.data?.fail;
			// @ts-expect-error unknown property
			result.data?.something;

			if (result.data && 'success' in result.data) {
				result.data.success === true;
				// @ts-expect-error should be of type `boolean`
				result.data.success === 'success';
				// @ts-expect-error does not exist in this branch
				result.data.id;
			}

			if (result.data && 'id' in result.data) {
				result.data.id === 42;
				// @ts-expect-error should be of type `number`
				result.data.id === 'John';
				// @ts-expect-error does not exist in this branch
				result.data.success;
			}
		}

		if (result.type === 'failure') {
			result.data;
			// @ts-expect-error does only exist on `success` result
			result.data.success;
			// @ts-expect-error unknown property
			result.data.unknown;

			if (result.data && 'fail' in result.data) {
				result.data.fail === '';
				// @ts-expect-error does not exist in this branch
				result.data.reason;
			}

			if (result.data && 'reason' in result.data) {
				result.data.reason.error.code === 'VALIDATION_FAILED';
				// @ts-expect-error should be a const
				result.data.reason.error.code === '';
				// @ts-expect-error does not exist in this branch
				result.data.fail;
			}
		}
	};
};
