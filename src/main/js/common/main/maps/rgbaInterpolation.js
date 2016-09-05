import linearInterpolation from '../general/linearInterpolation';

/*
	domain: Array[Number]
	colors: Array[[r,g,b,a]]

	returns: Number => [r,g,b,a]
*/
export default function rgbaInterpolation(domain, colors){

	const channelInters = [0, 1, 2, 3].map(
		channelIdx => linearInterpolation(domain, colors.map(c => c[channelIdx]))
	);

	return function(x){
		return channelInters.map(inter => inter(x));
	};
}

