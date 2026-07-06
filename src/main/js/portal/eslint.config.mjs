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
	},
	eslintConfigPrettier,
);
