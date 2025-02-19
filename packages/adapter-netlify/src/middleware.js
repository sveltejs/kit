import { initServer } from 'SERVER_INIT';
export { default } from 'MIDDLEWARE';

initServer({
	env: {
		env: /** @type {Record<string, string>} */ (process.env),
		public_prefix: 'PUBLIC_PREFIX',
		private_prefix: 'PRIVATE_PREFIX'
	}
});
