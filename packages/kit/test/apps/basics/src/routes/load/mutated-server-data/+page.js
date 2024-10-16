class CustomClass {}

export function load({ data }) {
	// @ts-ignore we want to mutate the server load data
	data.b = new CustomClass();
	// @ts-ignore we want to mutate the server load data
	data.d = {
		a: new CustomClass()
	}
	return data;
}
