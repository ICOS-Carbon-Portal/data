import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Circle from "ol/style/Circle";
import { Color } from "ol/color";
import { ColorLike } from "ol/colorlike";

const ptStyle = (fillColor: Color | ColorLike, strokeColor = 'black', strokeWidth = 1, radius = 4) => {
	return new Style({
		image: new Circle({
			radius,
			fill: new Fill({ color: fillColor }),
			stroke: new Stroke({ color: strokeColor, width: strokeWidth })
		})
	});
};

const oceanColor = 'rgb(92,43,147)';
// Eco is officially rgb(174,192,0), made brighter in map
const ecoColor = 'rgb(195,213,0)';
const atmoColor = 'rgb(228,28,100)';
const ecoAtmoColor = 'rgb(0,171,201)';

export default {
	countryStyle: new Style({
		fill: new Fill({
			color: 'rgb(205,170,102)'
		}),
		stroke: new Stroke({
			color: 'rgb(100,100,100)',
			width: 1
		})
	}),
	countryBorderStyle: [
		new Style({
			stroke: new Stroke({
				color: 'rgb(175,175,175)',
				width: 3
			})
		}),
		new Style({
			stroke: new Stroke({
				color: 'rgb(50,50,50)',
				width: 1
			})
		})
	],
	ptStyle,

	oceanStyle: ptStyle(oceanColor),
	ecoStyle: ptStyle(ecoColor),
	atmoStyle: ptStyle(atmoColor),
	ecoAtmoStyle: ptStyle(ecoAtmoColor),

	lnStyle: new Style({
		stroke: new Stroke({
			color: oceanColor,
			width: 2
		})
	})
};
