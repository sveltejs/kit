import { fail } from '../../../../../../types/internal.js';

const condition = false;

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
