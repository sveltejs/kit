import request from 'supertest';
import { Hono } from 'hono';
import { createAdaptorServer } from '@hono/node-server';
import { describe, expect, test } from 'vitest';

import { honoHandler } from './apps/hono/build/handler.js';

describe("Hono handler's tests", () => {
	const app = new Hono();

	app.use(...honoHandler);

	const server = createAdaptorServer(app);

	test('static file check', async () => {
		const res = await request(server).get('/favicon.svg');
		expect(res.status).toBe(200);
	});
});
