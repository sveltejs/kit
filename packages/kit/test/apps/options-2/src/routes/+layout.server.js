import { resolve, asset } from '$app/paths';

export function load() {
	return { layout_link: resolve('/hello'), layout_asset: asset('answer.txt') };
}
