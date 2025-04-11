/** @type {import('./$types').Socket} */
export const socket = {
	upgrade() {
		throw new Error('upgrade hook');
	}
};
