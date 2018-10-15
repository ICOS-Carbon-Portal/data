import {DomEvent, DomUtil} from "leaflet";

const statIconId = 'statIconId';
const statBodyId = 'statBodyId';

export const Stats = L.Control.extend({
	options: {
		position: 'topleft',
		showOnLoad: false,
		style: "font-size: 20px;"
	},

	addEvent: function(obj, types, fn, context){
		DomEvent.on(obj, types, fn, context);
		this.eventHandlers.push({obj, types, fn, context});
	},

	toggle: function() {
		const iconElement = DomUtil.get(statIconId);
		const bodyElement = DomUtil.get(statBodyId);

		if (iconElement.style.display === 'none') {
			iconElement.style.display = 'block';
			bodyElement.style.display = 'none';
		} else {
			iconElement.style.display = 'none';
			bodyElement.style.display = 'inline';
		}
	},

	initialize: function (options) {
		this.eventHandlers = [];
		this.pointCountTxt = L.DomUtil.create('span');
		this.minTxt = L.DomUtil.create('span');
		this.maxTxt = L.DomUtil.create('span');
		this.meanTxt = L.DomUtil.create('span');
		this.sdTxt = L.DomUtil.create('span');
		L.Util.setOptions(this, options);
	},

	onAdd: function (map) {
		const container = L.DomUtil.create('div');
		container.setAttribute("class", "leaflet-bar leaflet-control");
		container.setAttribute("style", this.options.style);
		DomEvent.disableClickPropagation(container);

		const iconElement = DomUtil.create('a', 'glyphicon glyphicon-info-sign', container);
		iconElement.setAttribute("role", "button");
		iconElement.setAttribute("id", statIconId);
		iconElement.setAttribute("title", "View statistics");

		const bodyElement = DomUtil.create('div', null, container);
		bodyElement.setAttribute("id", statBodyId);
		bodyElement.setAttribute("style", "display:none; font-size:12px; cursor:pointer; background-color:white;");

		addRow(bodyElement, 'Data points', this.pointCountTxt);
		addRow(bodyElement, 'Min', this.minTxt);
		addRow(bodyElement, 'Max', this.maxTxt);
		addRow(bodyElement, 'Mean', this.meanTxt);
		addRow(bodyElement, 'Standard deviation', this.sdTxt);

		this.addEvent(container, 'click', this.toggle, this);
		if (this.options.showOnLoad) this.toggle();

		return container;
	},

	updateStats: function(stats) {
		this.pointCountTxt.innerHTML = stats.pointCount.toLocaleString();
		this.minTxt.innerHTML = stats.min.toFixed(2);
		this.maxTxt.innerHTML = stats.max.toFixed(2);
		this.meanTxt.innerHTML = stats.mean.toFixed(2);
		this.sdTxt.innerHTML = stats.sd.toFixed(2);
	},

	onRemove: function () {
		this.eventHandlers.forEach(e => DomEvent.off(e.obj, e.types, e.fn, e.context));
	}
});

const addRow = (parent, headerTxt, placeholder) => {
	const rowDiv = DomUtil.create('div', null, parent);
	rowDiv.setAttribute("style", "background-color:inherit; padding:0 5px;");

	const header = DomUtil.create('b', null, rowDiv);
	header.setAttribute("style", "margin-right:5px");
	header.innerHTML = headerTxt + ':';

	rowDiv.appendChild(placeholder);
};
