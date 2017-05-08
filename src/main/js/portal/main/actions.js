export const ERROR = 'ERROR';

export function failWithError(error){
	console.log(error);
	return {
		type: ERROR,
		error
	};
}
