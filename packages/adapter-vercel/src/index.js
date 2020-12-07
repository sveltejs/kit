const { copyFileSync, writeFileSync, mkdirSync } = require('fs');
const { resolve, join } = require('path');
const { exec } = require('child_process');

module.exports = async function adapter(builder) {
	const vercel_output_directory = resolve('.vercel_build_output');
	const config_directory = join(vercel_output_directory, 'config');
	const static_directory = join(vercel_output_directory, 'static');
	const lambda_directory = join(vercel_output_directory, 'functions', 'node', 'render');
	const server_directory = join(lambda_directory, 'server');

	builder.log.minor('Writing client application...');
	builder.copy_static_files(static_directory);
	builder.copy_client_files(static_directory);

	builder.log.minor('Building lambda...');
	builder.copy_server_files(server_directory);
	const fileList = ['index.js', 'package.json'];
	fileList.forEach((f) =>
		copyFileSync(resolve(join(__dirname, '..', 'files', f)), join(lambda_directory, f))
	);
	exec('npm install', {
		cwd: lambda_directory,
		stdio: [1, 2, 3]
	});

	builder.log.minor('Prerendering static pages...');
	await builder.prerender({
		dest: static_directory
	});

	builder.log.minor('Writing routes...');
	mkdirSync(config_directory);
	writeFileSync(
		join(config_directory, 'routes.json'),
		JSON.stringify([
			{
				src: '/.*',
				dest: '.vercel/functions/render'
			}
		])
	);
};
