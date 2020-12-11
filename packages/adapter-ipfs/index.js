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

  for (const dir of new Set([ pages, assets ])) {
    const { path, size, cid } = await ipfs.add(IpfsHttpClient.globSource(dir, { recursive: true }));
    builder.log.minor(`Uploaded ${path}... ${size}b @ ${cid}`);
  }
};
