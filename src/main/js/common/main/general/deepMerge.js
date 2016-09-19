function isObject(item) {
	return (item && typeof item === 'object' && !Array.isArray(item) && item !== null);
}

export default function deepMerge(target, source) {
	if(source === null || source === undefined) return target;
	if(target === null || target === undefined || !isObject(source) || !isObject(target)) return source;

	let output = Object.assign({}, target);

	Object.keys(source).forEach(key => {
		if (target.hasOwnProperty(key))
			output[key] = deepMerge(target[key], source[key]);
		else output[key] = source[key];
	});

	return output;
}

