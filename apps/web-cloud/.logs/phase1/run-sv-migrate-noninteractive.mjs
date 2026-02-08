import fs from 'node:fs';

const migrateBase = 'C:/Users/huyit/AppData/Local/npm-cache/_npx/8acd29437c672435/node_modules';
const migrateUrl = (path) => new URL(`file:///${migrateBase}/${path}`);

const { default: glob } = await import(migrateUrl('tiny-glob/sync.js').href);
const { update_pkg_json, transform_module_code, transform_svelte_code } = await import(
  migrateUrl('svelte-migrate/migrations/svelte-5/migrate.js').href
);
const { transform_svelte_code: transform_app_state_code } = await import(
  migrateUrl('svelte-migrate/migrations/app-state/migrate.js').href
);
const { update_svelte_file, update_js_file } = await import(
  migrateUrl('svelte-migrate/utils.js').href
);

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const kitDep = pkg.devDependencies?.['@sveltejs/kit'] ?? pkg.dependencies?.['@sveltejs/kit'];

const { migrate } = await import('svelte/compiler');

update_pkg_json();

const useTs = fs.existsSync('tsconfig.json');
const folders = ['src'];
const svelteExtensions = ['.svelte'];
const extensions = [...svelteExtensions, '.ts', '.js'];

const files = folders.flatMap((folder) =>
  glob(`${folder}/**`, { filesOnly: true, dot: true })
    .map((file) => file.replace(/\\/g, '/'))
    .filter((file) => !file.includes('/node_modules/'))
);

for (const file of files) {
  if (!extensions.some((ext) => file.endsWith(ext))) {
    continue;
  }

  if (svelteExtensions.some((ext) => file.endsWith(ext))) {
    if (kitDep) {
      update_svelte_file(file, (code) => code, (code) => transform_app_state_code(code));
    }

    update_svelte_file(
      file,
      transform_module_code,
      (code) => transform_svelte_code(code, migrate, { filename: file, use_ts: useTs })
    );
    continue;
  }

  update_js_file(file, transform_module_code);
}
