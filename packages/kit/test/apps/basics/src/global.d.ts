declare global {
	interface Window {
		invalidated: boolean;
		oops: string;
		pageContext: any;
		fulfil_navigation: (value: any) => void;
	}
}

export {};
