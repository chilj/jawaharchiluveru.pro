// Ships the Sveltia CMS editor at /admin: copies its build and our config next to the admin page.
import { cpSync, readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// The package only exports its entry point; the browser build sits in dist/ beside it.
const cmsDist = join(dirname(require.resolve('@sveltia/cms')), '..', 'dist');
const config = fileURLToPath(new URL('../cms/config.yml', import.meta.url));

export default function cms() {
  return {
    name: 'jc-cms',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          const m = req.url?.match(/\/admin\/(config\.yml|sveltia-cms\.js|chunks\/.+)$/);
          if (!m) return next();
          const file = m[1] === 'config.yml' ? config : join(cmsDist, m[1]);
          if (!existsSync(file)) return next();
          res.setHeader('content-type', file.endsWith('.yml') ? 'text/yaml' : 'text/javascript');
          res.end(readFileSync(file));
        });
      },
      'astro:build:done': ({ dir }) => {
        const admin = fileURLToPath(new URL('admin/', dir));
        cpSync(join(cmsDist, 'sveltia-cms.js'), join(admin, 'sveltia-cms.js'));
        cpSync(join(cmsDist, 'chunks'), join(admin, 'chunks'), {
          recursive: true,
          filter: (src) => !src.endsWith('.map'),
        });
        cpSync(config, join(admin, 'config.yml'));
      },
    },
  };
}
