import { navigating } from '$app/state';

navigating.shallow satisfies boolean | null;

if (navigating.type === null) {
	navigating.shallow satisfies null;
	navigating.event satisfies null;
}

if (navigating.to) {
	navigating.shallow satisfies boolean;
}

if (navigating.type === 'link') {
	navigating.event satisfies PointerEvent;
}

if (navigating.type === 'form') {
	navigating.event satisfies SubmitEvent;
}

if (navigating.type === 'popstate') {
	navigating.event satisfies PopStateEvent;
}

if (navigating.type === 'goto') {
	// @ts-expect-error goto navigations do not carry an event
	navigating.event;
}
