export const load = ({ fetch }) => {
	return {
		root: fetch('/safe-assets/api').then(r => r.json())
	}
}