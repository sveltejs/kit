'use strict';

const IpfsHttpClient = require('ipfs-http-client');

module.exports = async function adapter(builder, { pages = 'build', assets = 'build', node = 'http://localhost:5001'} = {}) {
	builder.copy_static_files(assets);
	builder.copy_client_files(assets);

	await builder.prerender({
		force: true,
		dest: pages
  });
  
  builder.log.minor('Connecting to IPFS...');
  const ipfs = IpfsHttpClient(node);

  builder.log.minor('Uploading files...');
  const static_dirs = [ pages, assets ];
  const uploaded_files = await Promise.all(
    static_dirs.map(async dir => ipfs.add(IpfsHttpClient.globSource(dir, { recursive: true })))
  );
  
  console.log(uploaded_files.flat());
};
