export const GammaCtrl = L.Control.extend({
	options: {
		gamma: undefined,
		gammaChanged: undefined,
		position: 'bottomright',
		style: undefined
	},

	initialize: function (options) {
		L.Util.setOptions(this, options);
	},

	onAdd: function (map) {
		const addOption = (parent, val, txt) => {
			const option = L.DomUtil.create('option', null, parent);
			option.setAttribute("value", val);
			option.innerHTML = txt ? txt : val;
		};

		const onChange = e => {
			const idx = e.target.selectedIndex;

			if (idx > 0 && this.options.gammaChanged) {
				const val = e.target[idx].value;
				this.options.gammaChanged(val);
			}
		};

		const container = L.DomUtil.create('div', 'gamma-container', L.DomUtil.get('map'));
		container.setAttribute("style", this.options.style);

		const select = L.DomUtil.create('select', null, container);
		addOption(select, "Gamma");
		[0.1, 0.2, 0.3, 0.5, 1, 2, 3, 5].forEach(v => addOption(select, v));

		select.value = this.options.gamma ? this.options.gamma : 1;

		L.DomEvent.on(select, 'click', L.DomEvent.stopPropagation);
		L.DomEvent.on(select, 'change', onChange);

		return container;
	},

	onRemove: function (map) {
		map.off('change');
	},
});