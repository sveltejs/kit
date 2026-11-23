import { runtime } from 'conditions-dep';

export function GET() {
	return new Response(runtime);
}
