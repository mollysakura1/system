declare module 'unplugin-auto-import/vite' {
  import type { Plugin } from 'vite';

  interface AutoImportOptions {
    imports?: string[];
    resolvers?: unknown[];
    dts?: string | boolean;
  }

  export default function AutoImport(options?: AutoImportOptions): Plugin | Plugin[];
}

declare module 'unplugin-vue-components/vite' {
  import type { Plugin } from 'vite';

  interface ComponentsOptions {
    resolvers?: unknown[];
    dts?: string | boolean;
  }

  export default function Components(options?: ComponentsOptions): Plugin | Plugin[];
}

declare module 'unplugin-vue-components/resolvers' {
  export function ElementPlusResolver(): unknown;
}
