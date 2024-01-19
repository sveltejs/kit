import util from 'util';

export const prerender = false;

export const config = {
	runtime: 'edge'
};

export function GET() {
	return new Response(util.inspect({ message: 'hello' }));
}
