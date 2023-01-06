export function GET({ url }) {
	if (process.env.DEBUG) console.warn(`echo ${url.searchParams.get('msg')}\n\n`);
	return {};
}
