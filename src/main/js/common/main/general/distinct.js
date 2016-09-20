
export default function distinct(arr, keyMaker){
	let res = [];
	let set = new Set();

	arr.forEach(elem => {
		const key = keyMaker ? keyMaker(elem) : elem;
		if(!set.has(key)){
			set.add(key);
			res.push(elem);
		}
	});

	return res;
}

