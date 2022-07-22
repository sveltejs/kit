import { SECRET } from '$app/env/private';

export function GET() {
	return {
		body: {
			SECRET
		}
	};
}
