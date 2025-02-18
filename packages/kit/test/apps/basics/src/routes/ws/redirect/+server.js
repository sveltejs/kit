import { redirect } from '@sveltejs/kit';

export const socket = {
	upgrade() {
		redirect(303, '/ws?me');
	}
};
