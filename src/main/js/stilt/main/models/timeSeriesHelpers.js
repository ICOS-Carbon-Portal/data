import config from '../config';

export function prepareModelResultsGraphs(rawArray){
	const data = rawArray.map(row => {
		const copy = row.slice(0);
		copy[0] = new Date(row[0] * 1000);
		return copy;
	});
	return {data, labels: config.stiltResultColumns};
}
