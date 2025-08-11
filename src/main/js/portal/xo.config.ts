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
			"@stylistic/quotes": ["error", "double", {"allowTemplateLiterals": "always"}],
			"import-x/extensions": ["error", "never", { "fix": true }],
			"@stylistic/no-multiple-empty-lines": ["error", {"max": 2}],
			"@stylistic/member-delimiter-style": ["error", {
				"multiline": {"delimiter": "none", "requireLast": true},
				"singleline": {"delimiter": "comma", "requireLast": false}
			}],
			"unicorn/prevent-abbreviations": "off",
			"@stylistic/max-len": ["warn", {"code": 110}],
			"unicorn/filename-case": ["error", {"cases": {
				"pascalCase": true, "camelCase": true
			}}],
			"@stylistic/jsx-quotes": ["error", "prefer-double"],
			"promise/prefer-await-to-then": "off",
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
			"prefer-destructuring": "off",
			"no-warning-comments": "off",
		}
	},
	{
		react: true,
		files: [
			`main/models/**/${tsExtensionsGlob}`,
		],
		rules: {
			"@typescript-eslint/no-confusing-void-expression": ["error", {"ignoreArrowShorthand": true}],
			"@typescript-eslint/naming-convention": ["error", 
				{"selector": "default", "format": ["camelCase", "PascalCase"]},
				{"selector": "typeLike", "format": ["PascalCase"]},
				{"selector": "memberLike", "format": ["camelCase"], "modifiers":["private"], "leadingUnderscore": "allow"},
			],
			"@typescript-eslint/no-restricted-types": "off",
		}
	},
];

export default xoConfig;