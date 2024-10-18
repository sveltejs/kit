import type { AST } from 'svelte/compiler';

type ElementLike =
	| AST.Component
	| AST.TitleElement
	| AST.SlotElement
	| AST.RegularElement
	| AST.SvelteBody
	| AST.SvelteComponent
	| AST.SvelteDocument
	| AST.SvelteElement
	| AST.SvelteFragment
	| AST.SvelteHead
	| AST.SvelteOptionsRaw
	| AST.SvelteSelf
	| AST.SvelteWindow;

type Tag = AST.ExpressionTag | AST.HtmlTag | AST.ConstTag | AST.DebugTag | AST.RenderTag;

type Directive =
	| AST.AnimateDirective
	| AST.BindDirective
	| AST.ClassDirective
	| AST.LetDirective
	| AST.OnDirective
	| AST.StyleDirective
	| AST.TransitionDirective
	| AST.UseDirective;

type Block = AST.EachBlock | AST.IfBlock | AST.AwaitBlock | AST.KeyBlock | AST.SnippetBlock;

export type TemplateNode = AST.Text | Tag | ElementLike | AST.Comment | Block;

export type Attribute = AST.Attribute | AST.SpreadAttribute | Directive;
