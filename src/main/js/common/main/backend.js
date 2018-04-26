import config from "./config";
import 'whatwg-fetch';


export const logUsage = (dataToSave, formatFn) => {
	getWhoIam()
		.then(resp => {
			return resp.status === 200
				? resp.json()
				: {email: undefined, ip: undefined};
		})
		.then(user => {
			if (user.ip && user.ip !== '127.0.0.1') {
				saveToRestheart(formatFn(user, dataToSave));
			}
		});
};

export const getWhoIam = () => {
	return fetch('/whoami', {credentials: 'include'});
};

export const saveToRestheart = dataToSave => {
	return fetch(`${config.restheartPortalUseBaseUrl}/portaluse`, {
		method: 'POST',
		mode: 'cors',
		headers: new Headers({
			'Content-Type': 'application/json'
		}),
		body: JSON.stringify(dataToSave)
	});
};
