
export const ROUTE_UPDATED = 'ROUTE_UPDATED';

export function routeUpdated(){
	return {
		type: ROUTE_UPDATED,
		route: window.location.hash.substr(1)
	};
}

