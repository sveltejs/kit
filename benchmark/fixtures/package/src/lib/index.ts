export type BenchmarkTone = 'neutral' | 'positive' | 'caution';

export function formatMetric(value: number) {
	return `${value.toFixed(1)}ms`;
}

export { default as Component } from '$benchmark/Component.svelte';
