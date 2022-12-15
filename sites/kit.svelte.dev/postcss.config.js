import { readdirSync } from 'fs';
import { extname } from 'path';
import postcssPresetEnv from 'postcss-preset-env';

const baseCSSDir = './node_modules/@sveltejs/site-kit/styles/';
const cssFiles = readdirSync(baseCSSDir).filter(filename => extname(filename) === '.css').map(filename => baseCSSDir + filename);

export default {
    plugins: [
        postcssPresetEnv({
            stage: false,
            features: {
                'custom-properties': {
                    disableDeprecationNotice: true
                }
            },
            importFrom: cssFiles
        })
    ]
};