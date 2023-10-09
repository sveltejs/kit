export async function GET({ fetch }) {
	return await fetch('/prerendering/prerendered-endpoint/api');
}
