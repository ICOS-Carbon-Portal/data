import D from 'dygraphs';
import '../../../common/main/Dygraphs.css';

export const drawGraph = (timeserieData, varName, latlng) => {
	if (!document.getElementById('graph')) return;

	const pos = `Lat: ${latlng.lat}, Lng: ${latlng.lng}`;
	const legendFormatter = formatLegend(pos);

	new D(
		'graph',
		timeserieData,
		{
			legend: 'always',
			labelsDiv: 'graphLegend',
			labels: ['ts', varName],
			legendFormatter,
			xRangePad: 5,
			digitsAfterDecimal: 3,
			axes: {
				x: {
					drawGrid: false,
					axisLabelWidth: 80,
					valueFormatter: ms => toISOString(ms),
				},
				y: {
					axisLabelWidth: 65
				}
			}
		}
	);
};

const toISOString = ms => {
	const date = new Date(ms);

	function pad(number) {
		if (number < 10) {
			return '0' + number;
		}
		return number;
	}

	return date.getUTCFullYear() +
		'-' + pad(date.getUTCMonth() + 1) +
		'-' + pad(date.getUTCDate()) +
		' ' + pad(date.getUTCHours()) +
		':' + pad(date.getUTCMinutes()) +
		':' + pad(date.getUTCSeconds());
};

const formatLegend = (pos) => {
	return data => {
		const {color, dashHTML, labelHTML, yHTML} = data.series[0];

		return data.x === undefined
			? `${dashHTML} <span style="color:${color};font-weight:bold;">${labelHTML}</span> (${pos})`
			: `${data.xHTML}<span style="color:${color};font-weight:bold;margin-left:8px;">${labelHTML}</span>: ${yHTML}`;
	}
};
