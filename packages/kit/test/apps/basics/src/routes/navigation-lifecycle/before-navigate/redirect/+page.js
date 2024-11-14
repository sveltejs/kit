import { redirect } from '@sveltejs/kit';

export function load() {
	redirect(307, '/navigation-lifecycle/before-navigate/prevent-navigation');
}
