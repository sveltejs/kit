import { redirect } from '@sveltejs/kit';

export const ssr = false;

export async function load({ route }) {
	//@ts-ignore
	if (route.id == '/bad-route' || route.id == '/good-route') {
		throw redirect(302, '/');
	}
}
