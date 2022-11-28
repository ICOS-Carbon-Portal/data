import config from "./config";


export const saveToRestheart = dataToSave => {
	return fetch(config.portalUseLogUrl, {
		method: 'POST',
		mode: 'cors',
		credentials: 'include',
		headers: new Headers({
			'Content-Type': 'application/json'
		}),
		body: JSON.stringify(dataToSave)
	}).catch(error => {
		console.log(`Error logging portal usage to ${config.portalUseLogUrl}:`, error);
		console.log({failedPortalUsageLogPayload: dataToSave});
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
