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

export const logError = (app, message) => {
	saveToRestheart({
		error: {
			app,
			message,
			url: decodeURI(window.location)
		}
	});
};
