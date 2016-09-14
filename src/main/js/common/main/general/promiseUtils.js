

export function resolveAfter(delay, payload){
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(payload), delay);
	});
}

export function ensureDelay(innerPromise, delay){
	if(delay <= 0) return innerPromise;
	const delayed = resolveAfter(delay);
	return Promise.all([innerPromise, delayed]).then(([inner,]) => inner);
}

