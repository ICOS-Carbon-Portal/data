
export default function copyprops(source, props){
	const target = {};

	props.forEach(prop => {

		if(source.hasOwnProperty(prop)){
			target[prop] = source[prop];
		}

	});

	return target;
}

