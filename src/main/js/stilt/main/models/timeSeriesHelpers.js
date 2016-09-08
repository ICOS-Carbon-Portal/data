import config from '../config';
import DygraphData, {wdcggBinTableToDygraphData} from './DygraphData';

export function makeTimeSeriesGraphData(obsBinTable, rawArray, id){

	const obsSeriesList = config.wdcggColumns.map(labelToSeries);

	const obsDyData = wdcggBinTableToDygraphData(obsBinTable, obsSeriesList);

	const modelComponents = makeModelComponentsData(rawArray);

	return DygraphData.merge(obsDyData, modelComponents).withId(id);
}

function makeModelComponentsData(rawArray){

	const series = config.stiltResultColumns.map(labelToSeries);

	function rowGetter(i){
		const row = rawArray[i].slice(0);
		row[0] = new Date(row[0] * 1000);
		return row;
	}

	return new DygraphData(rowGetter, rawArray.length, series);
}

function labelToSeries(label){
	const axis = label == config.stiltResultColumns[0]
		? 'x'
		: config.primaryAxisColumns.indexOf(label) >= 0 ? 'y1' : 'y2';
	return {label, options: {axis}};
}

