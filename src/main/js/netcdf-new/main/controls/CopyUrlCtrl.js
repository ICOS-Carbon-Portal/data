export const CopyUrlCtrl = L.Control.extend({
	options: {
		position: 'bottomright',
		style: 'padding:3px 5px;background-color:white;box-shadow: 0 1px 5px rgba(0,0,0,0.4);border-radius: 5px;cursor:pointer;',
		urlCtrlStyle: 'width:400px;'
	},

	eventHandlers: [],

	initialize: function (options) {
		L.Util.setOptions(this, options);
	},

	addEvent: function(obj, types, fn, context){
		L.DomEvent.on(obj, types, fn, context);
		this.eventHandlers.push({obj, types, fn, context});
	},

	toggleUrlCtrl: function() {
		const urlCtrlWidget = L.DomUtil.get('urlCtrlWidget');

		if (urlCtrlWidget.style.display === 'none') {
			const urlInput = L.DomUtil.get('urlInput');

			urlInput.value = window.location;
			urlCtrlWidget.setAttribute("style", "display:table;" + this.options.urlCtrlStyle);

			urlInput.focus();
			urlInput.select();
		} else {
			urlCtrlWidget.setAttribute("style", "display:none;");
		}
	},

	copyUrl: function(){
		const urlInput = L.DomUtil.get('urlInput');

		urlInput.focus();
		urlInput.select();

		document.execCommand('copy');
	},

	onAdd: function (map) {
		const container = L.DomUtil.create('div', 'url-container', L.DomUtil.get('map'));
		container.setAttribute("style", this.options.style);

		const lbl = L.DomUtil.create('div', null, container);
		lbl.innerHTML = 'Copy url';
		lbl.setAttribute("style", "text-align:center;");
		lbl.setAttribute("title", "Click to show/hide the copy url widget");

		const root = L.DomUtil.create('div', 'input-group', container);
		root.setAttribute("id", "urlCtrlWidget");
		root.setAttribute("style", "display:none;");

		const input = L.DomUtil.create('input', 'form-control', root);
		input.setAttribute("id", "urlInput");
		input.setAttribute("type", "text");

		const span = L.DomUtil.create('span', 'input-group-addon', root);
		const ico = L.DomUtil.create('span', 'glyphicon glyphicon-copy', span);
		ico.setAttribute("title", "Copy url to clipboard");

		this.addEvent(container, 'click mousemove', L.DomEvent.stopPropagation);
		this.addEvent(container, 'click', this.toggleUrlCtrl, this);
		this.addEvent(span, 'click', this.copyUrl);

		return container;
	},

	onRemove: function () {
		this.eventHandlers.forEach(e => L.DomEvent.off(e.obj, e.types, e.fn, e.context));
	},
});