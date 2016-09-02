
export default function throttle(f, wait){
	var lastRun = Date.now();
	var timeout = null;

	return function(){
		const remaining = lastRun + wait - Date.now();
		const args = arguments;

		function run(){
			f.apply(null, args);
			lastRun = Date.now();
		}

		if(remaining <= 0)
			run()
		else {
			if(timeout) clearTimeout(timeout);
			timeout = setTimeout(run, remaining);
		}
	}
}

