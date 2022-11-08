let load_calls = 0;

export const load = () => {
	load_calls += 1;
	return { calls: load_calls };
};
