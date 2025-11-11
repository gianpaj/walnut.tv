import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Browser globals
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',

        // Node.js globals
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',

        // jQuery
        $: 'readonly',
        jQuery: 'readonly',

        // Custom globals
        channels: 'readonly',
        ga: 'readonly',
        gapi: 'readonly',
        reddit: 'readonly',
        YT: 'readonly',
        Vue: 'readonly',
        VueSelect: 'readonly',
      },
    },
  },
];
