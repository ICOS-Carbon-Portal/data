import Dygraph, {dygraphs} from 'dygraphs';
import '../../../common/main/Dygraphs.css';
import { Latlng, TimeserieData } from './State';

export const drawGraph = (timeserieData: TimeserieData[] | undefined, varName: string | undefined, latlng: Latlng | undefined) => {
	if (!document.getElementById('graph') || latlng === undefined || timeserieData === undefined || varName === undefined) {
		return;
	}

	const pos = `Lat: ${latlng.lat}, Lng: ${latlng.lng}`;
	const legendFormatter = formatLegend(pos);

	new Dygraph(
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

const toISOString = (ms: number) => {
	const date = new Date(ms);

	function pad(number: number) {
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

const formatLegend = (pos: string) => {
	return (data: dygraphs.LegendData) => {
		const {color, dashHTML, labelHTML, yHTML} = data.series[0];

		return data.x === undefined
			? `${dashHTML} <span style="color:${color};font-weight:bold;">${labelHTML}</span> (${pos})`
			: `${data.xHTML}<span style="color:${color};font-weight:bold;margin-left:8px;">${labelHTML}</span>: ${yHTML}`;
	}
};
