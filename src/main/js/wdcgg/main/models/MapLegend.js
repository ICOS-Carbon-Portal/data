import * as LCommon from 'icos-cp-leaflet-common';

export const MapLegend = L.Control.extend({
	options: {
		position: 'bottomright',
		collapsed: true
	},

	onAdd: function (map) {
		const legendContainer = L.DomUtil.create('div', 'legend-container', L.DomUtil.get('map'));
		const legend = L.DomUtil.create('div', 'legend', legendContainer);
		legend.innerHTML = getSvgLegend();

		return legendContainer;
	}
});

function getSvgLegend(){
	const pointIcon = LCommon.pointIcon();
	const pointIconExcluded = LCommon.pointIconExcluded();
	const startY = 12;
	const deltaY = 17;

	const svg = `<svg width="80" height="35">
		<circle cx="10" cy="${startY}" r="${pointIcon.radius}" style="fill:${pointIcon.fillColor}; stroke:${pointIcon.color}"/>
		<text x="20" y="${startY + pointIcon.radius}">Selected</text>
		<circle cx="10" cy="${startY + deltaY}" r="${pointIconExcluded.radius}" style="fill:${pointIconExcluded.fillColor}; stroke:${pointIconExcluded.color}"/>
		<text x="20" y="${startY + deltaY + pointIconExcluded.radius}">Excluded</text>
	</svg>`;

	return svg;
}
