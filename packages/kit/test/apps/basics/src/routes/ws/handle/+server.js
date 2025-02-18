export const socket = {
	upgrade() {
		// always abort the upgrade request because we just want to test the handle hook runs
		throw new Response();
	}
};
