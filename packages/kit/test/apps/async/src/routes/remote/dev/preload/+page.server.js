import { example } from './example.remote';

export const load = async () => {
	return {
		example: await example('bar')
	};
};
