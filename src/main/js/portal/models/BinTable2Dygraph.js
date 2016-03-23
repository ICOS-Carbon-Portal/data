
export function binTable2Dygraph(binTable){
	return Array.from({length: binTable.length}, (_, i) => {
		return [
			new Date(binTable.value(i, 0)),
			binTable.value(i, 1),
		];
	});
}