import { form, query } from '$app/server';
import * as v from 'valibot';

const ValueSchema = v.object({
	id: v.string(),
	text_field: v.string(),
	number_field: v.number(),
	select_field: v.string(),
	color_field: v.string(),
	range_field: v.number(),
	checkbox_field: v.optional(v.boolean(), false),

	hidden: v.object({
		string: v.string(),
		number: v.number(),
		boolean: v.boolean()
	})
});

const default_values: Array<Omit<v.InferOutput<typeof ValueSchema>, 'hidden'>> = [
	{
		id: '1',
		text_field: 'Example text',
		number_field: 42,
		select_field: 'apple',
		color_field: '#ff0000',
		range_field: 5,
		checkbox_field: true
	},
	{
		id: '2',
		text_field: 'Another example',
		number_field: 100,
		select_field: 'banana',
		color_field: '#ffff00',
		range_field: 8,
		checkbox_field: false
	}
];

let values = structuredClone(default_values);

export const get_values = query(() => values);

export const as_value_form = form(ValueSchema, async (data) => {
	const element = values.find((v) => v.id === data.id);
	if (element) {
		element.text_field = data.text_field;
		element.number_field = data.number_field;
		element.select_field = data.select_field;
		element.color_field = data.color_field;
		element.range_field = data.range_field;
		element.checkbox_field = data.checkbox_field;
		await get_values().refresh();
	}
});

export const reset_values = form(async () => {
	values = structuredClone(default_values);
});
