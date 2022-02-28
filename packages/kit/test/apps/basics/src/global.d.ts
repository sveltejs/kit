declare global {
	interface Window {
		oops: string;
		pageContext: any;
		fulfil_navigation: (value: any) => void;
	}
}

export {};
