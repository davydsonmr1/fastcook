// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';

/**
 * ESLint Flat Config — FlashCook Backend
 * Focado em segurança: detecta padrões perigosos que podem levar a
 * vulnerabilidades como injeção, eval, regex DoS, etc.
 */
export default tseslint.config(
  // Ignorar ficheiros gerados/desnecessários
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },

  // Regras base JS recomendadas
  js.configs.recommended,

  // Regras TypeScript recomendadas (modo estrito)
  ...tseslint.configs.strictTypeChecked,

  // Plugin de segurança — detecta padrões de código inseguro
  security.configs.recommended,

  // Configuração principal
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ── Regras de Segurança (eslint-plugin-security) ──────────────

      // Proíbe eval() — pode executar código arbitrário
      'security/detect-eval-with-expression': 'error',

      // Detecta RegEx que pode causar ReDoS (Denial of Service)
      'security/detect-unsafe-regex': 'error',

      // Proíbe Buffer sem codificação explícita (vulnerabilidade de memória)
      'security/detect-buffer-noassert': 'error',

      // Detecta uso de child_process com input não sanitizado
      'security/detect-child-process': 'error',

      // Alerta sobre disable de verificação de certificado SSL
      'security/detect-disable-mustache-escape': 'error',

      // Detecta ataques de timing em comparações de strings
      'security/detect-possible-timing-attacks': 'error',

      // Proíbe pseudoRandomBytes (usar crypto.randomBytes)
      'security/detect-pseudoRandomBytes': 'error',

      // Proíbe require() com path não-literal (path traversal)
      'security/detect-non-literal-require': 'error',

      // Proíbe RegExp() com strings dinâmicas (ReDoS)
      'security/detect-non-literal-regexp': 'warn',

      // Detecta leitura de ficheiros com paths não-literais (path traversal)
      'security/detect-non-literal-fs-filename': 'warn',

      // ── Regras TypeScript de Segurança ────────────────────────────

      // Proíbe any explícito — tipos inseguros escondem vulnerabilidades
      '@typescript-eslint/no-explicit-any': 'error',

      // Proíbe asserções de tipo não-nulo (pode mascarar null ref errors)
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Proíbe floating promises (erros silenciosos em async code)
      '@typescript-eslint/no-floating-promises': 'error',

      // Proíbe await em non-Thenable (pode ignorar erros)
      '@typescript-eslint/await-thenable': 'error',

      // Garante que strings de template não contêm expressões inseguras
      '@typescript-eslint/restrict-template-expressions': 'error',

      // ── Regras Gerais de Qualidade ────────────────────────────────
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'no-debugger': 'error',
    },
  },
);
