import { read } from '$app/server';

export async function load() {
	// the asset is only reachable through a dynamic import
	const { default: asset } = await import('./asset.js');

	return {
		text: await read(asset).text()
	};
}
