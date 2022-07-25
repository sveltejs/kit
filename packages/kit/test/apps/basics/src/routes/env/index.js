import { SECRET } from '$env/static/private';

export function GET() {
	return {
		body: {
			SECRET
		}
	};
}
