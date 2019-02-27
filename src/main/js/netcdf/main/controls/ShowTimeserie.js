export const ShowTimeserie = L.Control.extend({
	options: {
		position: 'topleft',
		style: 'cursor:pointer; display:none;'
	},

	eventHandlers: [],
	isActive: false,
	showTimeserieFn: undefined,
	mapClickFn: undefined,
	map: undefined,
	container: undefined,
	btn: undefined,

	initialize: function (showTimeserieFn, mapClickFn, options) {
		this.showTimeserieFn = showTimeserieFn;
		this.mapClickFn = mapClickFn;
		L.Util.setOptions(this, options);
	},

	addEvent: function(obj, types, fn, context){
		L.DomEvent.on(obj, types, fn, context);
		this.eventHandlers.push({obj, types, fn, context});
	},

	deactivate: function(){
		this.btnClick(false);
	},

	mapClick: function(e){
		if (!this.isActive) this.btnClick(true);

		this.mapClickFn(e);
	},

	btnClick: function(isActive){
		this.isActive = isActive === undefined ? !this.isActive : isActive;

		if (this.isActive){
			this.btn.style.backgroundColor = "#ddd";
			this.container.style.border = "2px solid rgba(200,0,0,0.6)";

		} else {
			this.btn.style.backgroundColor = "";
			this.container.style.border = "";
		}

		if (this.showTimeserieFn) this.showTimeserieFn(this.isActive);
	},

	onAdd: function (map) {
		this.map = map;

		this.container = L.DomUtil.create('div', "leaflet-bar leaflet-control", L.DomUtil.get('map'));
		this.container.setAttribute("style", this.options.style);

		this.btn = L.DomUtil.create('a', null, this.container);
		this.btn.setAttribute("href", "#");
		this.btn.setAttribute("title", "Show time series");

		L.DomUtil.create('span', "glyphicon glyphicon-signal", this.btn);

		this.addEvent(this.btn, 'click', L.DomEvent.stopPropagation);
		this.addEvent(this.btn, 'click', () => this.btnClick(), this);

		this.map.on('click', this.mapClick.bind(this));

		return this.container;
	},

	onRemove: function () {
		this.eventHandlers.forEach(e => L.DomEvent.off(e.obj, e.types, e.fn, e.context));
		this.map.off('click', this.mapClick.bind(this));
	}
});