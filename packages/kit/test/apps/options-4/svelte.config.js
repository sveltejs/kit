/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		subresourceIntegrity: 'sha384',
		integrityPolicy: {
			endpoints: ['default']
		}
	}
};

export default config;
