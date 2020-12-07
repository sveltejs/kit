const { writeFileSync, copyFileSync } = require('fs');
const { resolve, join } = require('path');

module.exports = async function adapter (builder) {
  const lambda_directory = resolve(join('functions', 'node', 'render'));
	const static_directory = resolve('public');
  const server_directory = resolve(join(lambda_directory, 'server'));
  
  builder.log.info('Writing client application...');
  builder.copy_static_files(static_directory);

  builder.log.info('Building lambda...');
  builder.copy_server_files(server_directory);
  const local_lambda_path = resolve(join(__dirname, '..', 'files', 'render.js'));
  copyFileSync(local_lambda_path, join(lambda_directory, 'index.js'));

  builder.log.info('Prerendering static pages...');
	await builder.prerender({
		dest: static_directory
	});

  builder.log.info('Rewriting vercel configuration...');
	writeFileSync(
		'vercel.json',
		JSON.stringify({
			public: true,
			build: {
				env: {
					NODEJS_AWS_HANDLER_NAME: 'handler'
				}
			},
			rewrites: [
				{
					source: '/(.*)',
					destination: '/api/render/'
				}
			]
		})
	);
};
