
export const FROM_DATE_SET = 'FROM_DATE_SET';
export const TO_DATE_SET = 'TO_DATE_SET';
export const COUNTRY_SET = 'COUNTRY_SET';

export function fromDateSet(date){
	return {
		type: FROM_DATE_SET,
		date
	};
}

export function toDateSet(date){
	return {
		type: TO_DATE_SET,
		date
	};
}

export function countrySet(country){
	return {
		type: COUNTRY_SET,
		country
	};
}

