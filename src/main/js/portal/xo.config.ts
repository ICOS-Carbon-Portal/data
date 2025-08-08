import {type FlatXoConfig} from 'xo';

const xoConfig: FlatXoConfig = [
	{
		files: ["**/*.tsx", "**/*.ts"],
		rules: {
			"@stylistic/quotes": ["error", "double", {"allowTemplateLiterals": "always"}],
			"import-x/extensions": ["error", "never", { "fix": true }],
			"@stylistic/no-multiple-empty-lines": ["error", {"max": 2}],
			"@stylistic/member-delimiter-style": ["error", {
				"multiline": {"delimiter": "none", "requireLast": true},
				"singleline": {"delimiter": "comma", "requireLast": true}
			}],
			"@typescript-eslint/no-confusing-void-expression": ["error", {"ignoreArrowShorthand": true}],
			"unicorn/prevent-abbreviations": ["off"],
			"@typescript-eslint/naming-convention": ["error", 
				{"selector": "default", "format": ["camelCase", "PascalCase"]},
				{"selector": "typeLike", "format": ["PascalCase"]},
				{"selector": "memberLike", "format": ["camelCase"], "modifiers":["private"], "leadingUnderscore": "allow"},
			],
			"@stylistic/max-len": ["warn", {"code": 110}],
			"unicorn/filename-case": ["error", {"cases": {
				"pascalCase": true, "camelCase": true
			}}],
			"@stylistic/jsx-quotes": ["error", "prefer-double"],
		}
	}
];

export default xoConfig;