import { form } from '$app/server';
import { schema } from './schema.ts';

export const myform = form(schema, async () => ({ ok: true }));
