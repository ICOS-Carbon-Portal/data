import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Circle from "ol/style/Circle";
import { Color } from "ol/color";
import { ColorLike } from "ol/colorlike";
import RegularShape from "ol/style/RegularShape";

const cirlcePointStyle = (fillColor: Color | ColorLike, strokeColor: Color | ColorLike, radius: number, strokeWidth: number) => new Style({
	image: new Circle({
		radius,
		fill: new Fill({ color: fillColor }),
		stroke: new Stroke({ color: strokeColor, width: strokeWidth })
	})
});

const trianglePointStyle = (fillColor: Color | ColorLike, strokeColor: Color | ColorLike, radius: number, strokeWidth: number) => new Style({
	image: new RegularShape({
		radius,
		fill: new Fill({ color: fillColor }),
		stroke: new Stroke({ color: strokeColor, width: strokeWidth }),
		points: 3,
	}),
});

const oceanColor = 'rgb(92,43,147)';
// Eco is officially rgb(174,192,0), made brighter in map
const ecoColor = 'rgb(195,213,0)';
const atmoColor = 'rgb(228,28,100)';
const ecoAtmoColor = 'rgb(0,171,201)';

export default {
	countryStyle: new Style({
		fill: new Fill({
			color: 'PapayaWhip'
		}),
		stroke: new Stroke({
			color: 'DimGray',
			width: 1
		})
	}),
	countryBorderStyle: [
		new Style({
			stroke: new Stroke({
				color: 'DarkGray',
				width: 2
			})
		}),
		new Style({
			stroke: new Stroke({
				color: 'DarkSlateGray',
				width: 1
			})
		})
	],
	cirlcePointStyle,
	trianglePointStyle,

	oceanStyle: cirlcePointStyle(oceanColor, 'black', 4, 1),
	ecoStyle: cirlcePointStyle(ecoColor, 'black', 4, 1),
	atmoStyle: cirlcePointStyle(atmoColor, 'black', 4, 1),
	ecoAtmoStyle: cirlcePointStyle(ecoAtmoColor, 'black', 4, 1),

	lnStyle: new Style({
		stroke: new Stroke({
			color: oceanColor,
			width: 2
		})
	})
};
