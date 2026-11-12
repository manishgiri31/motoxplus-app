// Stand-in for zod's locale barrel (see metro.config.js). zod re-exports every
// locale (~50 languages) as `z.locales`; Metro can't tree-shake, so all of
// them were bundled. The app only uses English, which zod installs by default.
export { default as en } from 'zod/v4/locales/en.js';
