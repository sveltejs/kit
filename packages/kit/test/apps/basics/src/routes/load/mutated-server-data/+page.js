class CustomClass {}

export function load({ data }) {
	// @ts-ignore we want to mutate the server load data
	data.b = new CustomClass();
	return data;
}
