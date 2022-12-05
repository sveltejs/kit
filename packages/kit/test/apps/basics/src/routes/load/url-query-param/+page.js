export function load({ data, url }) {
	return { ...data, currentClientState: url.searchParams.get('currentClientState') };
}
