export const FullExtent = L.Control.extend({
	options: {
		position: 'topleft',
		style: "font-size: 20px;"
	},

	map: undefined,
	points: undefined,
	eventHandlers: [],

	addEvent: function(obj, types, fn, context){
		L.DomEvent.on(obj, types, fn, context);
		this.eventHandlers.push({obj, types, fn, context});
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
	},

	onAdd: function (map) {
		this.map = map;
		const container = L.DomUtil.create('div');
		container.setAttribute("class", "leaflet-bar leaflet-control");
		container.setAttribute("style", this.options.style);

		const img = L.DomUtil.create('a', "fas fa-globe", container);
		img.setAttribute("role", "button");
		img.setAttribute("title", "Zoom to full extent");

		this.addEvent(img, 'click', this.zoomFullExtent, this);

		return container;
	},

	updatePoints: function(points) {
		this.points = points;
	},

	zoomFullExtent: function() {
		if (this.points) this.map.fitBounds(this.points);
	},

	onRemove: function () {
		this.eventHandlers.forEach(e => L.DomEvent.off(e.obj, e.types, e.fn, e.context));
	},
});