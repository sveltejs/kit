import fs from 'node:fs';
import path from 'node:path';

/**
 * Generates a production package.json
 * @param {{
 *   build_data: import('types').BuildData;
 *   cwd: string;
 * }} opts
 */
export function generate_package_json({build_data, cwd}) {

  const package_json_text = fs.readFileSync(path.resolve(cwd, 'package.json'), 'utf8');
  const package_json = JSON.parse(package_json_text);
  const dependences_with_versions = Object.assign(
    {},
    package_json.devDependencies || {},
    package_json.dependencies || {}
  );

  const dependencies = Object.keys(dependences_with_versions);

  /** @type {Set<string>} */
  const dependencies_set = new Set(dependencies);

  const prod_package_json = Object.assign({}, package_json);
  delete prod_package_json.devDependencies;
  delete prod_package_json.scripts;
  prod_package_json.dependencies = {};

  const chunks = [build_data.client.chunks, build_data.server.chunks].flat();
  if(chunks.length > 0) {
    /** @type {string[]} */
    const dependency_names = filter_import_packages(chunks, dependencies_set);
    dependency_names.sort();
    prod_package_json.dependencies = create_dependency_object(dependency_names, dependences_with_versions);
  }

  return JSON.stringify(prod_package_json, null, 2);
}
/**
 *
 * @param {import('rollup').OutputChunk[]} chunks
 * @param {Set<string>} dependencies_set
 */
function filter_import_packages(chunks, dependencies_set) {
  /** @type {string[]} */
  const import_names = chunks.reduce((deps, chunk) => {
    if(chunk.imports.length > 0) {
      for(let i = 0; i < chunk.imports.length; i++) {
        const importName = chunk.imports[i];
        if(dependencies_set.has(importName)) {
          deps.push(importName);
        }
      }
    }

    return deps;
  }, []);

  return import_names;
}

/**
 *
 * @param {string[]} dependency_names
 * @param {{[key: string]: string}} dependences_with_versions
 */
function create_dependency_object(dependency_names, dependences_with_versions) {
  /** @type {{[key: string]: string}} */
  const dependencies = {};
  for(let i = 0; i < dependency_names.length; i++) {
    dependencies[dependency_names[i]] = dependences_with_versions[dependency_names[i]];
  }

  return dependencies;
}
