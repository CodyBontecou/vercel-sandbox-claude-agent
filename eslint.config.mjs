import {
  defineConfig,
  globalIgnores,
} from 'eslint/config';
// eslint-disable-next-line max-len
import vitals from 'eslint-config-next/core-web-vitals';
// eslint-disable-next-line max-len
import ts from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...vitals,
  ...ts,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    rules: {
      'max-len': [
        'error',
        {
          code: 40,
          tabWidth: 2,
          ignoreUrls: true,
          ignoreComments: true,
        },
      ],
    },
  },
]);

export default eslintConfig;
