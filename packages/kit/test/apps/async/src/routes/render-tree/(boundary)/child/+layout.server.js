/** @type {import('./$types').LayoutServerLoad} */
export function load({ depends, url }) {
	depends('render-tree:child');
	return { child: url.searchParams.get('child') ?? 'child' };
}
