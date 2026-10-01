import { json } from '@sveltejs/kit';

export const config = {
	isr: {
		expiration: 60
	}
};

export function GET() {
	return json({ ok: true });
}
