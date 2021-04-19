export type I18nLocale = {
	code: string;
	iso: string;
	prefix?: string;
};

export type I18nConfig = {
	defaultLocale: string;
	fallbackLocale: string;
	locales: I18nLocale[];
	prefixDefault: boolean;
	prefixRoutes: boolean;
};

export type Translations = {
	[key: string]: string | Translations;
};

export type I18n = {
	defaultLocale?: string;
	locale?: I18nLocale;
	locales: I18nLocale[];
	localizedPaths: { [locale: string]: string };
	translations: Translations;
};
