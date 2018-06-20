import { Control, DomUtil, Util, DomEvent } from 'leaflet';

const containerId = 'containerId';
const iconId = 'iconId';
const iconStyle = "display:table;font-size:30px;margin:3px 2px 0 0;";
const legendId = 'legendId';

Control.LegendCtr = Control.extend({
	options: {
		position: 'topright',
		style: 'padding:3px 5px;background-color:white;box-shadow: 0 1px 5px rgba(0,0,0,0.4);border-radius: 5px;cursor:pointer;'
	},

	initialize: function (legend, options) {
		this.legend = legend;
		this.eventHandlers = [];
		Util.setOptions(this, options);
	},

	toggle: function() {
		const iconElement = DomUtil.get(iconId);
		const legendElement = DomUtil.get(legendId);

		if (iconElement.style.display === 'none') {
			iconElement.setAttribute("style", iconStyle);
			legendElement.setAttribute("style", "display:none;");
		} else {
			iconElement.setAttribute("style", "display:none;");
			legendElement.setAttribute("style", "display:inline;");
		}
	},

	addEvent: function(obj, types, fn, context){
		DomEvent.on(obj, types, fn, context);
		this.eventHandlers.push({obj, types, fn, context});
	},

	onAdd: function (map) {
		const container = DomUtil.create('div', 'legend-container', map.getContainer());
		container.setAttribute("id", containerId);
		container.setAttribute("style", this.options.style);
		DomEvent.disableClickPropagation(container);

		const iconElement = DomUtil.create('span', 'glyphicon glyphicon-list-alt', container);
		iconElement.setAttribute("id", iconId);
		iconElement.setAttribute("title", "View legend");
		iconElement.setAttribute("style", iconStyle);

		const legendElement = DomUtil.create('div', null, container);
		legendElement.setAttribute("id", legendId);
		legendElement.setAttribute("style", "display:none;");

		legendElement.appendChild(this.legend);

		this.addEvent(container, 'click', this.toggle, this);

		return container;
 	},

	update: function(legend) {
		const legendElement = DomUtil.get(legendId);
		DomUtil.empty(legendElement);
		legendElement.appendChild(legend);
	},

	onRemove: function () {
		this.eventHandlers.forEach(e => DomEvent.off(e.obj, e.types, e.fn, e.context));
	}
});

export function legendCtrl(legend, options){
	return new Control.LegendCtr(legend, options);
}
