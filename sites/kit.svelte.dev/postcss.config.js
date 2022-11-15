import { readFileSync, writeFileSync } from 'fs';
import postcssPresetEnv from 'postcss-preset-env';

const baseCSSDir = './node_modules/@sveltejs/site-kit/';
const baseCSS = baseCSSDir + 'base.css';
const baseCSSLegacy = baseCSSDir + 'base-legacy-rooted-vars.css';

const baseCSSContent = readFileSync(baseCSS, { encoding: 'utf-8' });
const rootedSelectorCSS = baseCSSContent.replace(/}(\s*(\/\*.*?\*\/))*\s*(?<selector>.+?)\s*{/gs, (match, ...args) => {
    const { selector } = /** @type{Record<'selector', string>} */(args[args.length - 1]);
    const lastClosing = selector.lastIndexOf('}');
    const afterClosing = (lastClosing >= 0)
        ? selector.slice(lastClosing + 1)
        : selector;

    return (afterClosing.length === 0 || afterClosing.includes('@media')) ? match : match.replace(afterClosing, ':root');
});
writeFileSync(baseCSSLegacy, rootedSelectorCSS, { encoding: 'utf-8' });

export default {
    plugins: [
        postcssPresetEnv({
            stage: false,
            features: {
                'custom-properties': {
                    disableDeprecationNotice: true
                }
            },
            importFrom: baseCSSLegacy
        })
    ]
};