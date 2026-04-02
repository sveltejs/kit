import { form, query } from '$app/server';
import * as v from 'valibot';

const ValueSchema = v.object({
	id: v.string(),
	text_field: v.string(),
	number_field: v.number(),
	select_field: v.string(),
	color_field: v.string(),
	range_field: v.number()
});

const default_values: Array<v.InferInput<typeof ValueSchema>> = [
	{
		id: '1',
		text_field: 'Example text',
		number_field: 42,
		select_field: 'apple',
		color_field: '#ff0000',
		range_field: 5
	},
	{
		id: '2',
		text_field: 'Another example',
		number_field: 100,
		select_field: 'banana',
		color_field: '#00ff00',
		range_field: 8
	}
];

let values: Array<v.InferInput<typeof ValueSchema>> = [
	{
		id: '1',
		text_field: 'Example text',
		number_field: 42,
		select_field: 'apple',
		color_field: '#ff0000',
		range_field: 5
	},
	{
		id: '2',
		text_field: 'Another example',
		number_field: 100,
		select_field: 'banana',
		color_field: '#00ff00',
		range_field: 8
	}
];

export const get_values = query(() => values);

export const as_value_form = form(ValueSchema, async (data) => {
	const element = values.find((v) => v.id === data.id);
	if (element) {
		element.text_field = data.text_field;
		element.number_field = data.number_field;
		element.select_field = data.select_field;
		element.color_field = data.color_field;
		element.range_field = data.range_field;
	}
});

export const reset_values = form(async () => {
	values = structuredClone(default_values);
});
