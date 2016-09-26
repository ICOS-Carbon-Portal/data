
export function pad2(num){
	return ('0' + num).slice(-2);
}

export function formatDate(millis){
	const d = new Date(millis);
	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:00`;
}

