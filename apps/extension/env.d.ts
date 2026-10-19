/** Build-time variables this extension reads (set by `pnpm build:test`, CI, or a `.env` file). */
interface ImportMetaEnv {
  readonly WXT_TEST_MODE?: string;
  readonly WXT_CMS_BASE_URL?: string;
}
