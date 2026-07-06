import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
	{
		files: ["main/models/**/*.ts", "main/models/**/*.tsx"],
		extends: [
			js.configs.recommended,
			...tseslint.configs.recommendedTypeChecked,
			react.configs.flat.recommended,
			reactHooks.configs.flat["recommended-latest"],
		],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		settings: {
			react: {
				version: "detect",
			},
		},
		rules: {
			// Downgraded: diffuse `any` leakage from untyped third-party libs and
			// JS interop, not per-instance bugs. Fix at the type boundary, not inline.
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unsafe-assignment": "warn",
			"@typescript-eslint/no-unsafe-member-access": "warn",
			"@typescript-eslint/no-unsafe-argument": "warn",
			"@typescript-eslint/no-unsafe-return": "warn",
			"@typescript-eslint/no-unsafe-call": "warn",
			// Downgraded: wrong type annotations / rejection-value shape, not
			// runtime bugs. exhaustive-deps is prone to false positives on
			// intentional mount-only effects.
			"@typescript-eslint/no-wrapper-object-types": "warn",
			"@typescript-eslint/prefer-promise-reject-errors": "warn",
			"react-hooks/exhaustive-deps": "warn",
			// Downgraded: this codebase intentionally uses documentation-only string
			// aliases (UrlStr, Sha256Str, etc.) unioned with literal sets for human
			// readability, even though they collapse to the primitive type.
			"@typescript-eslint/no-redundant-type-constituents": "warn",
			// Allow a leading underscore to mark a parameter as intentionally
			// unused (e.g. keeping an event-handler signature self-documenting).
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
		},
	},
	eslintConfigPrettier,
);
