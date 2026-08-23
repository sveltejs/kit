import { form, query } from '$app/server';
import * as v from 'valibot';
import { per_session } from '../../per-session.js';

const SettingsSchema = v.object({
	visibility: v.picklist(['public', 'private']),
	tags: v.array(v.string()),
	notifications: v.optional(v.boolean(), false)
});

const session = per_session(() => ({
	settings: {
		visibility: 'public',
		tags: ['red'],
		notifications: false
	} as v.InferOutput<typeof SettingsSchema>
}));

export const get_settings = query(() => session().settings);

export const update_settings = form(SettingsSchema, async (data) => {
	session().settings = data;
	await get_settings().refresh();
});
