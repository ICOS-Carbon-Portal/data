export const TextControl = L.Control.extend({
	options: {
		position: 'topright',
		style: "background-color: white; padding: 3px 5px;box-shadow: 0 1px 5px rgba(0,0,0,0.4);border-radius: 5px; font-size: 16px;"
	},

	lbl: undefined,

	initialize: function (options) {
		L.Util.setOptions(this, options);
	},

	onAdd: function (map) {
		const container = L.DomUtil.create('div');
		container.setAttribute("style", this.options.style);

		this.lbl = L.DomUtil.create('div', null, container);
		this.lbl.innerHTML = 'Waiting for data...';
		this.lbl.setAttribute("style", "text-align:center;");

		return container;
	},

	updateTxt: function(txt) {
		this.lbl.innerHTML = txt;
	}
});