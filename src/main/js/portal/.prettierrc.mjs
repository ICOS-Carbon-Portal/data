/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */

// most options are listed below; if they have no comment, they are the default prettier option

const config = {
  experimentalOperatorPosition: "start", // will be new default
  experimentalTernaries: true, // will be new default
  printWidth: 100, // note: does not control "max line length", but provides a "goal"
  tabWidth: 4, // unused due to useTabs: true
  useTabs: true, // customized
  semi: true,
  singleQuote: false,
  quoteProps: "as-needed",
  jsxSingleQuote: false,
  trailingComma: "all",
  bracketSpacing: true,
  objectWrap: "preserve",
  bracketSameLine: false,
  arrowParens: "always",
  requirePragma: true, // customized - requires a tag at the top of a file to enable editing
  insertPragma: false, // requirePragma can be set to false and insertPragma to true to developers actively
                       // transitioning files to prettier; this allows automated tools to work on certain files
                       // but not others, until they are tagged with a pragma
  proseWrap: "preserve",
  htmlWhitespaceSensitivity: "css",
  endOfLine: "lf",
  embeddedLanguageFormatting: "auto",
  singleAttributePerLine: false,
};

export default config;

{

}
