
export const ROUTE_UPDATED = 'ROUTE_UPDATED';

export function routeUpdated(route){
	return {
		type: ROUTE_UPDATED,
		route: route ? route : window.location.hash.substr(1)
	};
}

