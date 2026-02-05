// we need both queries to prevent Vite from inlining the asset as base64 string on build
// see https://github.com/vitejs/vite/issues/19562
import asset from './example.json?url&no-inline';

export async function load({ fetch }) {
	const res = await fetch(asset);
	const data = await res.json();
	return data;
}
