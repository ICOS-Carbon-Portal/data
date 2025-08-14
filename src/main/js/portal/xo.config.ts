import {type FlatXoConfig} from "xo";

const tsExtensions = ['ts', 'tsx', 'cts', 'mts'];
const jsExtensions = ['js', 'jsx', 'mjs', 'cjs'];
const allExtensions = [...jsExtensions, ...tsExtensions];

const allExtensionsGlob = `*.{${allExtensions.join(',')}}`;
const tsExtensionsGlob = `*.{${tsExtensions.join(',')}}`;

const xoConfig: FlatXoConfig = [
	{
		ignores: [
			"tsTarget/**",
			"node_modules/**",
			"external-modules/**",
			"test/**",
			allExtensionsGlob,
			`main/${allExtensionsGlob}`,
			`main/actions/**/${allExtensionsGlob}`,
			`main/backend/**/${allExtensionsGlob}`,
			`main/components/**/${allExtensionsGlob}`,
			`main/containers/**/${allExtensionsGlob}`,
			`main/hooks/**/${allExtensionsGlob}`,
			//`main/models/**/${allExtensionsGlob}`,
			`main/reducers/**/${allExtensionsGlob}`,
		],
	},
	{
		react: true,
		files: [
			`main/models/**/${allExtensionsGlob}`,
		],
		rules: {
			"@stylistic/comma-dangle": ["error", {
				"arrays": "only-multiline",
				"objects": "only-multiline",
				"imports": "never",
				"exports": "never",
				"functions": "never",
				"importAttributes": "never",
				"dynamicImports": "never",
				"enums": "only-multiline",
				"generics": "never",
				"tuples": "only-multiline",
			}],
			"@stylistic/function-paren-newline": ["error", "consistent"],
			"@stylistic/jsx-quotes": ["error", "prefer-double"],
			"@stylistic/max-len": ["off", {"code": 120}], // Temporarily disabled
			"@stylistic/member-delimiter-style": ["error", {
				"multiline": {"delimiter": "none", "requireLast": true},
				"singleline": {"delimiter": "comma", "requireLast": false}
			}],
			"@stylistic/no-multiple-empty-lines": ["error", {"max": 2}],
			"@stylistic/operator-linebreak": "off",
			"@stylistic/padding-line-between-statements": "off",
			"@stylistic/quotes": "off",
			"capitalized-comments": "off",
			"import-x/extensions": ["error", "never", { "fix": true }],
			"import-x/no-anonymous-default-export": "off",
			"import-x/order": "off",
			"no-else-return": "off",
			"no-warning-comments": "off",
			"prefer-destructuring": "off",
			"promise/prefer-await-to-then": "off",
			"react-hooks/exhaustive-deps": "off",
			"react/boolean-prop-naming": "off",
			"react/iframe-missing-sandbox": "off",
			"react/jsx-boolean-value": ["error", "always"],
			"react/jsx-closing-bracket-location": "off", // Conflicts, works inconsistently with ternary operators
			"react/jsx-closing-tag-location": "off", // Conflicts, works inconsistently with ternary operators
			"react/jsx-curly-newline": "off",
			"react/jsx-indent-props": ["error", { indentMode: "tab", ignoreTernaryOperator: true}],
			"react/jsx-no-bind": "warn",
			"react/jsx-sort-props": "off",
			"react/jsx-tag-spacing": ["error", {"beforeSelfClosing": "allow"}],
			"react/prefer-read-only-props": "off",
			"react/require-default-props": "off",
			"unicorn/filename-case": ["error", {"cases": {
				"pascalCase": true, "camelCase": true
			}}],
			"unicorn/no-array-for-each": "off",
			"unicorn/no-array-reduce": "off",
			"unicorn/no-this-assignment": "warn",
			"unicorn/prefer-dom-node-append": "off",
			"unicorn/prefer-query-selector": "off",
			"unicorn/prevent-abbreviations": "off",
			"unicorn/switch-case-braces": "off",
		}
	},
	{
		files: [
			`main/models/**/${tsExtensionsGlob}`,
		],
		rules: {
			"@typescript-eslint/array-type": "off",
			"@typescript-eslint/default-param-last": "warn",
			"@typescript-eslint/member-ordering": "off",
			"@typescript-eslint/naming-convention": ["warn", 
				{"selector": "default", "format": ["camelCase", "PascalCase"]},
				{"selector": "typeLike", "format": ["PascalCase"]},
				{"selector": "memberLike", "format": ["camelCase"], "modifiers":["private"], "leadingUnderscore": "allow"},
				{"selector": "memberLike", "format": ["camelCase"], "modifiers":["readonly"], "leadingUnderscore": "allow"},
				{"selector": "parameter", "format": ["camelCase"], "modifiers":["unused"], "leadingUnderscore": "allow"},
			],
			"@typescript-eslint/no-confusing-void-expression": ["error", {"ignoreArrowShorthand": true}],
			"@typescript-eslint/no-dynamic-delete": "warn",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-redeclare": "off",
			"@typescript-eslint/no-restricted-types": "off",
			"@typescript-eslint/no-this-alias": "warn",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-function-type": "warn",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unused-vars": "warn",
			"@typescript-eslint/restrict-plus-operands": "warn",
			"@typescript-eslint/switch-exhaustiveness-check": ["error",
				{
					"allowDefaultCaseForExhaustiveSwitch": false,
					"considerDefaultExhaustiveForUnions": true,
					"requireDefaultForNonUnion": true,
				}
			],
			"@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
		}
	},
];

export default xoConfig;
