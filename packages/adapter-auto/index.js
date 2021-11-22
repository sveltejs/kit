const adapters = [
	{
		test: () => !!process.env.VERCEL,
		module: '@sveltejs/adapter-vercel'
	},
	{
		test: () => !!process.env.NETLIFY,
		module: '@sveltejs/adapter-netlify'
	},
	{
		test: () => !!process.env.CF_PAGES,
		module: '@sveltejs/adapter-cloudflare'
	}
];

/** @type {import('.')} **/
export default function () {
	return {
		name: '@sveltejs/adapter-auto',

		async adapt(options) {
			for (const candidate of adapters) {
				if (candidate.test()) {
					options.utils.log.info(`Detected support for ${candidate.module}`);

					const module = await import(candidate.module);
					const adapter = module.default();

					return adapter.adapt(options);
				}
			}

			options.utils.log.warn(
				'Could not detect production environment. You may need to install an adapter. See https://kit.svelte.dev/docs#adapters for more information'
			);
		}
	};
}
