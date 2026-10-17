/**
 * Cấu hình ESLint phẳng (Flat Config) cho dự án TypeScript + Node.js ESM.
 */
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '*.log', 'public/**'],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'server/**/*.mjs', 'tools/**/*.mjs'],
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-constant-condition': ['error', { checkLoops: false }],
    },
  },
];
