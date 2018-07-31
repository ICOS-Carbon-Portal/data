export const TextControl = L.Control.extend({
	options: {
		position: 'topright',
		style: "background-color: white; padding: 3px 5px;box-shadow: 0 1px 5px rgba(0,0,0,0.4);border-radius: 5px; font-size: 16px;"
	},

	lbl: undefined,
	eventHandlers: [],

	addEvent: function(obj, types, fn, context){
		L.DomEvent.on(obj, types, fn, context);
		this.eventHandlers.push({obj, types, fn, context});
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
	},

	onAdd: function (map) {
		const container = L.DomUtil.create('div', 'text-container', L.DomUtil.get('map'));
		container.setAttribute("style", this.options.style);

		this.lbl = L.DomUtil.create('div', null, container);
		this.lbl.innerHTML = 'Waiting for data...';
		this.lbl.setAttribute("style", "text-align:center;");

		return container;
	},

	updateLbl: function(txt) {
		this.lbl.innerHTML = txt;
	},

	onRemove: function () {
		this.eventHandlers.forEach(e => L.DomEvent.off(e.obj, e.types, e.fn, e.context));
	},
});