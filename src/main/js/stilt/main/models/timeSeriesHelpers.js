import config from '../config';
import DygraphData, {wdcggBinTableToDygraphData} from './DygraphData';

export function prepareModelResultsGraphs(rawArray){
	const data = rawArray.map(row => {
		const copy = row.slice(0);
		copy[0] = new Date(row[0] * 1000);
		return copy;
	});
	return {data, labels: config.stiltResultColumns};
}

export function makeObservationsVsModelComparison(obsBinTable, rawArray){
	const obsDyData = wdcggBinTableToDygraphData(obsBinTable, ['isodate', 'co2.observed']);

	const co2Index = config.stiltResultColumns.indexOf(config.totalCo2Column);

	function rowGetter(i){
		const orig = rawArray[i];
		return [new Date(orig[0] * 1000), orig[co2Index]];
	}

	const modelDyData = new DygraphData(rowGetter, rawArray.length, ['isodate', config.totalCo2Column]);

	return DygraphData.merge(obsDyData, modelDyData);
}
