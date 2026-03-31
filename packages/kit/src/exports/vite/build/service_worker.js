/**
 * @param {import("vite").ViteBuilder} builder
 * @param {import("vite").Alias[]} config_aliases
 * @returns {Promise<string>}
 */
export async function build_service_worker(builder, config_aliases) {
	// mirror client settings that we couldn't set per environment in the config hook
	builder.environments.serviceWorker.config.define = builder.environments.client.config.define;
	builder.environments.serviceWorker.config.resolve.alias = [...config_aliases];

	// we have to overwrite this because it can't be configured per environment in the config hook
	builder.environments.serviceWorker.config.experimental.renderBuiltUrl = (filename) => {
		return {
			runtime: `new URL(${JSON.stringify(filename)}, location.href).pathname`
		};
	};

	// TODO: use Vite's dev full-bundle mode when it's out
	const build = /** @type {import('vite').Rolldown.RolldownOutput} */ (
		await builder.build(builder.environments.serviceWorker)
	);

	const chunk = build.output.find(
		(chunk) => chunk.type === 'chunk' && chunk.fileName === 'service-worker.js'
	);

	if (chunk?.type !== 'chunk') {
		throw new Error('Failed to find the service-worker chunk');
	}

	return chunk.code;
}
