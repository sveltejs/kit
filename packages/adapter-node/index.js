'use strict';

const fs = require('fs');
const { join } = require('path');

module.exports = async function adapter(builder) {
	const out = 'build'; // TODO implement adapter options

	builder.log.minor('Writing client application...');
	const static_directory = join(out, 'assets');
	builder.copy_client_files(static_directory);
	builder.copy_static_files(static_directory);

	builder.log.minor('Building server');
	builder.copy_server_files(out);

	fs.copyFileSync(`${__dirname}/files/server.js`, `${out}/index.js`);

	builder.log.minor('Prerendering static pages...');
	await builder.prerender({
		dest: `${out}/prerendered`
	});
};
