'use strict';

const fs = require('fs');

module.exports = async function adapter(builder) {
	const out = 'build'; // TODO implement adapter options

	builder.copy_server_files(out);
	builder.copy_client_files(`${out}/assets/_app`);

	fs.copyFileSync(`${__dirname}/files/server.js`, `${out}/index.js`);

	builder.log.info('Prerendering static pages...');
	await builder.prerender({
		dest: `${out}/prerendered`
	});
};
