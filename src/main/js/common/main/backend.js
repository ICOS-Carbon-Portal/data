import config from "./config";
import 'whatwg-fetch';


export const saveToRestheart = dataToSave => {
	return fetch(`${config.portalUseLogUrl}`, {
		method: 'POST',
		mode: 'cors',
		headers: new Headers({
			'Content-Type': 'application/json'
		}),
		body: JSON.stringify(dataToSave)
	});
};
