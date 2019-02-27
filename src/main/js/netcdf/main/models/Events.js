export default class Events{
	constructor(){
		this.eventList = [];
	}

	add(type, event, options){
		document.addEventListener(type, event, options);
		this.eventList.push({target: document, type, event, options});
	}

	addToTarget(target, type, event, options){
		target.addEventListener(type, event, options);
		this.eventList.push({target, type, event, options});
	}

	clear(){
		this.eventList.forEach(({target, type, event, options}) => {
			target.removeEventListener(type, event, options)
		});

		this.eventList = [];
	}
}
