import { form, query } from '$app/server';
import * as v from 'valibot';
import { per_session } from '../../per-session.js';

const SettingsSchema = v.object({
	title: v.pipe(v.string(), v.minLength(1)),
	visibility: v.picklist(['public', 'private']),
	tags: v.optional(v.array(v.string()), [])
});

const SurveySchema = v.object({
	visibility: v.picklist(['public', 'private']),
	tags: v.optional(v.array(v.string()), [])
});

const session = per_session(() => ({
	settings: {
		title: 'hello',
		visibility: 'public',
		tags: ['red']
	} as v.InferOutput<typeof SettingsSchema>,
	surveys: [] as v.InferOutput<typeof SurveySchema>[]
}));

export const get_settings = query(() => session().settings);

export const get_surveys = query(() => session().surveys);

export const update_settings = form(SettingsSchema, async (data) => {
	session().settings = data;
	await get_settings().refresh();
});

export const create_survey = form(SurveySchema, async (data) => {
	session().surveys.push(data);
	await get_surveys().refresh();
});
