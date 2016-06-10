import * as LCommon from './LeafletCommon';

export const MapLegend = L.Control.extend({
	options: {
		position: 'bottomright',
		collapsed: true
	},

	onAdd: function (map) {
		const legendContainer = L.DomUtil.create('div', 'legend-container', L.DomUtil.get('map'));
		// const legendToggle = L.DomUtil.create('a', 'legend-toggle', legendContainer);
		const legend = L.DomUtil.create('div', 'legend', legendContainer);
		legend.innerHTML = getSvgLegend();

		return legendContainer;
	}
});

function getSvgLegend(){
	const pointIcon = LCommon.pointIcon();
	const pointIconExcluded = LCommon.pointIconExcluded();
	const pointIconExcluded2 = LCommon.pointIconExcluded2();
	// console.log({pointIcon, pointIconExcluded, pointIconExcluded2});

	const svg = `<svg viewBox="0 0 80 55" width="80" height="55">
		<circle cx="10" cy="15" r="${pointIcon.radius}" style="fill:${pointIcon.fillColor}; stroke:${pointIcon.color}"/>
		<text x="20" y="${15 + pointIcon.radius}">Selected</text>
		<circle cx="10" cy="30" r="${pointIconExcluded.radius}" style="fill:${pointIconExcluded.fillColor}; stroke:${pointIconExcluded.color}"/>
		<text x="20" y="${30 + pointIconExcluded.radius}">Excluded</text>
		<circle cx="10" cy="45" r="${pointIconExcluded2.radius}" style="fill:${pointIconExcluded2.fillColor}; stroke:${pointIconExcluded2.color}"/>
		<text x="20" y="${45 + pointIconExcluded2.radius}">Excluded</text>
	</svg>`;

	return svg;
}
