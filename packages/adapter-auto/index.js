import { adapters } from './adapters.js';

/** @type {import('./index')} */
let fn;

for (const candidate of adapters) {
	if (candidate.test()) {
		/** @type {{ default: () => import('@sveltejs/kit').Adapter }} */
		let module;

		try {
			module = await import(candidate.module);

			fn = () => {
				const adapter = module.default();
				return {
					...adapter,
					adapt: (builder) => {
						builder.log.info(`Detected environment: ${candidate.name}. Using ${candidate.module}`);
						return adapter.adapt(builder);
					}
				};
			};

			break;
		} catch (error) {
			if (
				error.code === 'ERR_MODULE_NOT_FOUND' &&
				error.message.startsWith(`Cannot find package '${candidate.module}'`)
			) {
				throw new Error(
					`It looks like ${candidate.module} is not installed. Please install it and try building your project again.`
				);
			}

			throw error;
		}
	}
}

if (!fn) {
	fn = () => ({
		name: '@sveltejs/adapter-auto',
		adapt: (builder) => {
			builder.log.warn(
				'Could not detect a supported production environment. See https://kit.svelte.dev/docs/adapters to learn how to configure your app to run on the platform of your choosing'
			);
		}
	});
}

export default fn;
