import { redirect } from '@sveltejs/kit';

export const load = ({ depends, url, untrack }) => {
	depends('app:goto');
	if (untrack(() => url.searchParams.get('redirect') !== null)) {
		return redirect(302, '/goto/loadreplace1');
	}
};
