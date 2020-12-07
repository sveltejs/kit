const { copyFileSync, writeFileSync, mkdirSync } = require('fs');
const { resolve, join } = require('path');

module.exports = async function adapter (builder) {
  const vercel_output_directory = resolve('.vercel_build_output');
  const config_directory = join(vercel_output_directory, 'config');
  const static_directory = join(vercel_output_directory, 'static');
  const lambda_directory = join(vercel_output_directory, 'functions', 'node', 'render');
  const server_directory = join(lambda_directory, 'server');
  
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
  
  builder.log.info('Writing routes...');
  mkdirSync(config_directory);
  writeFileSync(
    join(config_directory, 'routes.json'),
    JSON.stringify({
      routes: [
        {
          src: '/.*',
          dest: '/functions/node/render'
        }
      ]
    })
  );
};
