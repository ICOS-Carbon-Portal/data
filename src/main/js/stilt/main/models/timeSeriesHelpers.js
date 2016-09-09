import config from '../config';
import DygraphData, {wdcggBinTableToDygraphData} from './DygraphData';

export function makeTimeSeriesGraphData(obsBinTable, rawArray, id){

	const obsDyData = wdcggBinTableToDygraphData(obsBinTable, config.wdcggColumns);

	const modelComponents = makeModelComponentsData(rawArray);

	return DygraphData.merge(obsDyData, modelComponents).withId(id);
}

function makeModelComponentsData(rawArray){

	function rowGetter(i){
		const row = rawArray[i].slice(0);
		row[0] = new Date(row[0] * 1000);
		return row;
	}

	return new DygraphData(rowGetter, rawArray.length, config.stiltResultColumns);
}

