---
title: Accessibilité
---

SvelteKit aspire à fournir par défaut une plateforme accessible pour votre application. Les <span class='vo'>[vérifications d'accessibilité faites par Svelte au moment de la compilation](PUBLIC_SVELTE_SITE_URL/docs#accessibility-warnings)</span> sont aussi appliquées à toute application SvelteKit que vous développez.

Voici comment les fonctionnalités d'accessibilité intégrées de SvelteKit fonctionnent et ce que vous devez savoir pour aider ces vérifications à fonctionner aussi bien que possible. Gardez en tête que même si SvelteKit fournit une base accessible, vous êtes tout de même vous assurer que le code de votre application soit accessible. Si vous êtes novice en accessibilité, reportez-vous à la section ["sur le même sujet"](#sur-le-m-me-sujet) de ce guide pour obtenir des ressources supplémentaires.

Nous avons conscience que l'accessibilité est un sujet difficile. Si vous souhaitez suggérer des améliorations à la façon dont SvelteKit gère l'accessibilité, nous vous invitons à [ouvrir une issue sur Github](https://github.com/sveltejs/kit/issues).

## Annonce des routes

Dans les applications rendues côté serveur traditionnelles, chaque navigation (c'est-à-dire, chaque clic sur une balise `<a>`) déclenche un rechargement complet de la page. Lorsque ceci se produit, les lecteurs d'écrans et autres technologies d'assistance lisent le titre de la nouvelle page afin que les utilisateurs et utilisatrices comprennent que la page a changé.

Puisque la navigation entre pages dans une application SvelteKit se produit sans rechargement de la page (ce qu'on appelle le [routing côté client](glossary#routing)), SvelteKit injecte une [zone live](https://developer.mozilla.org/fr/docs/Web/Accessibility/ARIA/ARIA_Live_Regions) dans la page qui va permettre la lecture à voix haute du nom de la nouvelle page après chaque navigation. Ce processus détermine le nom de la page à annoncer en inspectant l'élément `<title>`.

À cause de ce comportement, chaque page dans votre application doit avoir un titre unique et descriptif. Vous pouvez faire cela avec SvelteKit en plaçant un élément `<svelte:head>` sur chaque page :

```svelte
<!--- file: src/routes/+page.svelte --->
<svelte:head>
	<title>À faire</title>
</svelte:head>
```

Ceci va permettre aux lecteurs d'écrans et autres technologies d'assistance d'identifier la nouvelle page après qu'une navigation a eu lieu. Fournir un titre descriptif est également important pour le [référencement](seo#gestion-manuelle-title-et-meta).

## Gestion du focus

Dans les applications rendues côté serveur traditionnelles, chaque navigation va réinitialiser le focus en haut de la page. Cela garantit aux personnes naviguant sur le web avec un clavier ou un lecteur d'écran de commencer à interagir avec la page depuis son début.

Pour simuler ce comportement pendant les navigations côté client, SvelteKit met le focus sur l'élément `<body>` après chaque navigation et chaque [soumission de formulaire améliorée](form-actions#am-lioration-progressive). Il y a une exception – si un élément avec l'attribut [`autofocus`](https://developer.mozilla.org/fr/docs/Web/HTML/Global_attributes/autofocus) est présent dans la page, SvelteKit va plutôt mettre le focus sur cet élément. Ayez toutefois conscience des implications que ce choix a sur les technologies d'assistance lorsque vous souhaitez utiliser cet attribut.

Si vous souhaitez personnaliser la gestion du focus de SvelteKit, vous pouvez utiliser la fonction `afterNavigate` :

```js
/// <reference types="@sveltejs/kit" />
// ---cut---
import { afterNavigate } from '$app/navigation';

afterNavigate(() => {
	/** @type {HTMLElement | null} */
	const to_focus = document.querySelector('.focus-me');
	to_focus?.focus();
});
```

Vous pouvez aussi naviguer programmatiquement vers une page différente en utilisant la fonction [`goto`](modules#$app-navigation-goto). Par défaut, ceci aura le même comportement côté client qu'un clic sur un lien. Toutefois, `goto` accepte aussi une option `keepFocus` qui permet de préserver l'élément ayant actuellement le focus plutôt que de réinitialiser le focus. Si vous activez cette option, assurez-vous que l'élément ayant le focus existe toujours sur la page après la navigation. Si l'élément n'existe plus, l'utilisateur ou l'utilisatrice va perdre le focus, rendant l'expérience confuse pour les personnes utilisant des technologies d'assistance.

## L'attribut `lang`

Par défaut, le <span class='vo'>[template](PUBLIC_SVELTE_SITE_URL/docs/development#template)</span> de page de SvelteKit définit le langage par défaut à Anglais. Si votre contenu n'est pas en Anglais, vous devriez mettre à jour l'élément `<html>` dans `src/app.html` pour avoir l'attribut [`lang`](https://developer.mozilla.org/fr/docs/Web/HTML/Global_attributes/lang#accessibility) correct. Cela permet aux technologies d'assistance qui lisent le document d'utiliser la bonne prononciation. Par exemple, si votre contenu est en Allemand, vous devriez mettre à jour le fichier `app.html` de cette manière :

```html
/// file: src/app.html
<html lang="de">
```

Si votre contenu est disponible dans plusieurs langages, vous devriez définir l'attribut `lang` en fonction du langage de la page courante. Vous pouvez faire ceci en utilisant le [hook `handle` de SvelteKit](hooks#hooks-de-serveur-handle) :

```html
/// file: src/app.html
<html lang="%lang%">
```

```js
/// file: src/hooks.server.js
/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
function get_lang(event) {
	return 'en';
}
// ---cut---
/** @type {import('@sveltejs/kit').Handle} */
export function handle({ event, resolve }) {
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', get_lang(event))
	});
}
```

## Sur le même sujet

Dans les grandes lignes, le développement d'une application accessible avec SvelteKit est similaire au développement d'une application web accessible classique. Vous devriez pouvoir appliquer les recommandations des ressources suivantes sur l'accessibilité à n'importe expérience web que vous construisez :

- [Documentation de MDN Web: Accessibilité](https://developer.mozilla.org/fr/docs/Learn/Accessibility)
- [Le Projet A11y](https://www.a11yproject.com/) (en anglais)
- [How to Meet WCAG (Quick Reference)](https://www.w3.org/WAI/WCAG21/quickref/) (en anglais)
