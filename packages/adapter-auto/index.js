const adapters = [
	{
		test: () => !!process.env.VERCEL,
		module: () => import('@sveltejs/adapter-vercel')
	},
	{
		test: () => !!process.env.NETLIFY,
		module: () => import('@sveltejs/adapter-netlify')
	}
];

/** @type {import('.')} **/
export default function () {
	return {
		name: '@sveltejs/adapter-auto',

		async adapt(options) {
			for (const candidate of adapters) {
				if (candidate.test()) {
					const module = await candidate.module();
					const adapter = module.default();

					options.utils.log.info(`Detected support for ${adapter.name}`);

					return adapter.adapt(options);
				}
			}

			options.utils.log.warn(
				'Could not detect production environment. You may need to install an adapter. See https://kit.svelte.dev/docs#adapters for more information'
			);
		}
	};
}
