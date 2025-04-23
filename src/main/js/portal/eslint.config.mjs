import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

console.log(eslint.configs.recommended) 

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.base,
	tseslint.configs.eslintRecommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		ignores: [
			"eslint.config.mjs",
		],
		//files: [ '**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts' ],
		rules: {
			// base
			"no-prototype-builtins": "error",
			"prefer-const": "warn",
			"curly": ["error", "always"],

			// functional - from tseslint.configs.recommended-type-checked
			"@typescript-eslint/no-unsafe-argument": "error",
			"@typescript-eslint/no-unsafe-call": "error",
			"@typescript-eslint/no-unsafe-member-access": "error",
			"@typescript-eslint/no-unsafe-return": "error",
			"@typescript-eslint/no-unsafe-assignment": "error",
			"@typescript-eslint/no-explicit-any": "error",

			"@typescript-eslint/no-redundant-type-constituents": "error",
			"@typescript-eslint/no-unsafe-function-type": "error",
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": "error",
			"@typescript-eslint/no-wrapper-object-types": "error",
			"@typescript-eslint/no-this-alias": "error",
			"@typescript-eslint/no-base-to-string": "error",
			"@typescript-eslint/no-empty-object-type": "error",
			"@typescript-eslint/no-unnecessary-type-assertion": "error",
			"@typescript-eslint/no-duplicate-type-constituents": "error",
			
			"@typescript-eslint/unbound-method": "warn",
			"@typescript-eslint/restrict-plus-operands": "warn",

			"@typescript-eslint/no-floating-promises": "warn",
			'prefer-promise-reject-errors': 'off',
			"@typescript-eslint/prefer-promise-reject-errors": "warn",

			// stylistic - from tseslint.configs.stylistic-type-checked
			"dot-notation": "off",
			"@typescript-eslint/dot-notation": "warn",
			"@typescript-eslint/prefer-optional-chain": "warn",
			"@typescript-eslint/array-type": "warn",
			"@typescript-eslint/consistent-type-assertions": "warn",

			"@typescript-eslint/consistent-type-definitions": ["warn", "interface"],
			"@typescript-eslint/no-inferrable-types": "warn",
			"@typescript-eslint/prefer-nullish-coalescing": "warn",
			"@typescript-eslint/consistent-indexed-object-style": "warn",
			"@typescript-eslint/prefer-regexp-exec": "off",

			// rules that did not trigger and "make sense"
			// base
			'no-var': 'error',
			'prefer-rest-params': 'error',
			'prefer-spread': 'error',
			
			// functional
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/ban-ts-comment': 'error',
			'no-array-constructor': 'off',
			'@typescript-eslint/no-array-constructor': 'error',
			'@typescript-eslint/no-array-delete': 'error',
			'@typescript-eslint/no-duplicate-enum-values': 'error',
			'@typescript-eslint/no-extra-non-null-assertion': 'error',
			'@typescript-eslint/no-for-in-array': 'error',
			'no-implied-eval': 'off',
			'@typescript-eslint/no-implied-eval': 'error',
			'@typescript-eslint/no-misused-new': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/no-namespace': 'error',
			'@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
			'@typescript-eslint/no-require-imports': 'error',
			'@typescript-eslint/no-unnecessary-type-constraint': 'error',
			'@typescript-eslint/no-unsafe-declaration-merging': 'error',
			'@typescript-eslint/no-unsafe-enum-comparison': 'error',
			'@typescript-eslint/no-unsafe-unary-minus': 'error',
			'no-unused-expressions': 'off',
			'@typescript-eslint/no-unused-expressions': 'error',
			'no-throw-literal': 'off',
			'@typescript-eslint/only-throw-error': 'error',
			'@typescript-eslint/prefer-namespace-keyword': 'error',
			'require-await': 'off',
			'@typescript-eslint/require-await': 'error',
			'@typescript-eslint/restrict-template-expressions': 'error',
			'@typescript-eslint/triple-slash-reference': 'error',

			// stylistic
			'@typescript-eslint/adjacent-overload-signatures': 'warn',
			'@typescript-eslint/ban-tslint-comment': 'warn',
			'@typescript-eslint/class-literal-property-style': 'warn',
			'@typescript-eslint/consistent-generic-constructors': 'warn',
			'@typescript-eslint/no-confusing-non-null-assertion': 'warn',
			'no-empty-function': 'off',
			'@typescript-eslint/no-empty-function': 'warn',
			'@typescript-eslint/non-nullable-type-assertion-style': 'warn',
			'@typescript-eslint/prefer-find': 'warn',
			'@typescript-eslint/prefer-for-of': 'warn',
			'@typescript-eslint/prefer-function-type': 'warn',
			'@typescript-eslint/prefer-includes': 'warn',
			'@typescript-eslint/prefer-string-starts-ends-with': 'warn',
		}
	}
);