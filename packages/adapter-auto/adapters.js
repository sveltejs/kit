export const adapters = [
	{
		name: 'Vercel',
		test: () => !!process.env.VERCEL,
		module: '@sveltejs/adapter-vercel'
	},
	{
		name: 'Cloudflare Pages',
		test: () => !!process.env.CF_PAGES,
		module: '@sveltejs/adapter-cloudflare'
	},
	{
		name: 'Netlify',
		test: () => !!process.env.NETLIFY,
		module: '@sveltejs/adapter-netlify'
	},
	{
		name: 'Azure Static Web Apps',
		test: () => process.env.GITHUB_ACTION_REPOSITORY === 'Azure/static-web-apps-deploy',
		module: 'svelte-adapter-azure-swa'
	}
];
