import fetch from 'node-fetch';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_KEY;

export async function create({ userid = 'admin', text }: { userid: string; text: string }) {
	const res = await fetch(`${URL}/rest/v1/todos`, {
		method: 'POST',
		headers: {
			apikey: KEY,
			authorization: `Bearer ${KEY}`,
			prefer: 'return=representation',
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			userid,
			text
		})
	});

	const body = await res.json();

	return {
		status: res.status,
		body: res.ok ? body[0] : body
	};
}

export async function read({ userid = 'admin' }: { userid: string }) {
	const res = await fetch(`${URL}/rest/v1/todos?select=*&order=created`, {
		headers: {
			apikey: KEY,
			authorization: `Bearer ${KEY}`
		}
	});

	return {
		status: res.status,
		body: await res.json()
	};
}

export async function update({
	userid = 'admin',
	id,
	text,
	done
}: {
	userid: string;
	id: string;
	text: string;
	done: boolean;
}) {
	const res = await fetch(`${URL}/rest/v1/todos?userid=eq.${userid}&id=eq.${id}`, {
		method: 'PATCH',
		headers: {
			apikey: KEY,
			authorization: `Bearer ${KEY}`,
			prefer: 'return=representation',
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			text,
			done
		})
	});

	const body = await res.json();

	return {
		status: res.status,
		body: res.ok ? body[0] : body
	};
}

export async function del({ userid = 'admin', id }: { userid: string; id: string }) {
	const res = await fetch(`${URL}/rest/v1/todos?userid=eq.${userid}&id=eq.${id}`, {
		method: 'DELETE',
		headers: {
			apikey: KEY,
			authorization: `Bearer ${KEY}`
		}
	});

	return {
		status: res.status,
		body: res.ok ? {} : await res.json()
	};
}
