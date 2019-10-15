import * as CSS from 'csstype';

export type Style = CSS.Properties<string | number>;
type StyleWIndex = Style & {[key: string]: string | number};

export const getCssText = (style: Style) => {
	const styleAttr = document.createElement('span').style;

	Object.keys(style).forEach((key: string) => {
		const val = (style as StyleWIndex)[key];
		(styleAttr as any)[key] = isNaN(val as any) ? val : val + "px";
	});

	return styleAttr.cssText;
};
