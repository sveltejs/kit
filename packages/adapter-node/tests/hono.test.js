import request from 'supertest';
import { Hono } from 'hono';
import { createServer } from 'node:http2';
import { serve } from '@hono/node-server';
import { beforeAll, describe, expect, test } from 'vitest';

import { honoHandler } from './apps/hono/build/handler.js';

describe("Hono handler's tests", () => {
	const app = new Hono();

	app.get('/api/test', (c) => {
		return c.text('this is get request');
	});

	app.post('/api/test', (c) => {
		return c.text('this is post request');
	});

	app.use(...honoHandler);

	const server = serve({
		fetch: app.fetch,
		createServer
	});

	const client = request(server, { http2: true });

	beforeAll(() => {
		server.close();
	});

	test('static file check', async () => {
		const res = await client.get('/favicon.svg');
		expect(res.status).toBe(200);
	});

	test('page check (/images)', async () => {
		const res = await client.get('/images');
		expect(res.status).toBe(200);
	});

	test('page check (/[slug])', async () => {
		const res = await client.get('/example');
		expect(res.status).toBe(200);
	});

	test('404 page check', async () => {
		const res = await client.get('/this/is/not-found');
		expect(res.status).toBe(404);
	});

	test('api check (get)', async () => {
		const res = await client.get('/api/test');
		expect(res.status).toBe(200);
		expect(res.text).toBe('this is get request');
	});

	test('api check (post)', async () => {
		const res = await client.post('/api/test');
		expect(res.status).toBe(200);
		expect(res.text).toBe('this is post request');
	});
});
