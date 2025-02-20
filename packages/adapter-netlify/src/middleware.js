import { initServer } from 'SERVER_INIT';
export { default } from 'MIDDLEWARE';

initServer({
	env: {
		// @ts-ignore
		env: Deno.env.toObject(),
		public_prefix: 'PUBLIC_PREFIX',
		private_prefix: 'PRIVATE_PREFIX'
	}
});
