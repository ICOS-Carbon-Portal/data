import config from '../config';
import DygraphData, {wdcggBinTableToDygraphData} from './DygraphData';

const co2Index = config.stiltResultColumns.indexOf(config.totalCo2Column);

export function makeTimeSeriesGraphData(obsBinTable, rawArray){
	const obsVsModel = makeObservationsVsModelComparison(obsBinTable, rawArray);
	const modelComponents = makeModelComponentsData(rawArray);

	return {obsVsModel, modelComponents};
}

function makeModelComponentsData(rawArray){
	const labels = config.stiltResultColumns.slice(0);
	labels.splice(co2Index, 1);

	function rowGetter(i){
		const orig = rawArray[i];
		const row = [new Date(orig[0] * 1000)];

		for(let i = 1; i < orig.length; i++){
			if(i != co2Index) row.push(orig[i]);
		}
		return row;
	}

	return new DygraphData(rowGetter, rawArray.length, labels);
}

function makeObservationsVsModelComparison(obsBinTable, rawArray){
	const obsDyData = wdcggBinTableToDygraphData(obsBinTable, ['isodate', 'co2.observed']);

	function rowGetter(i){
		const orig = rawArray[i];
		return [new Date(orig[0] * 1000), orig[co2Index]];
	}

	const modelDyData = new DygraphData(rowGetter, rawArray.length, ['isodate', config.totalCo2Column]);

	return DygraphData.merge(obsDyData, modelDyData);
}

