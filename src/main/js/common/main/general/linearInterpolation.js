
export default function linearInterpolation(domain, range){
	return function(x){
		var i = 0;
		while(i < domain.length && x > domain[i]) i++;

		if(i == 0) return range[0];
		if(i == domain.length) return range[domain.length - 1];

		var slope = (range[i] - range[i - 1]) / (domain[i] - domain[i - 1]);
		return range[i - 1] + (x - domain[i - 1]) * slope;
	};
}

