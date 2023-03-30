export const load = ({ fetch }) => {
	return {
		child: fetch('/safe-assets/api/child').then((r) => r.json())
	};
};
