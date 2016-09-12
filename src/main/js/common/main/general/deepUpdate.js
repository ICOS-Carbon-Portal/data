
export default function deepUpdate(obj, path, update){
	if(!path || !(path.length) || path.length <= 0) return Object.assign({}, obj, update);

	const segment = path[0];
	return Object.assign({}, obj, {[segment]: deepUpdate(obj[segment], path.slice(1), update)});
}

