import { redirect } from '@sveltejs/kit';

export async function load({ url }) {
	redirect(307, `/tracing/one/two/three/four/five${url.search}`);
}
