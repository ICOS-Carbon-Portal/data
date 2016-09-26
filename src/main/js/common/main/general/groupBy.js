
export default function groupBy(arr, keyMaker, valueMaker){
	return arr.reduce(function(acc, elem){
		const key = keyMaker(elem);
		const value = valueMaker ? valueMaker(elem) : elem;

		if(acc.hasOwnProperty(key)) acc[key].push(value)
		else acc[key] = [value];

		return acc;
	}, {});
}

