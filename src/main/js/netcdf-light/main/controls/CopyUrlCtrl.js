export const CopyUrlCtrl = L.Control.extend({
	options: {
		position: 'bottomright',
		style: 'padding:5px;background-color:white;box-shadow: 0 1px 5px rgba(0,0,0,0.4);border-radius: 5px;cursor:pointer;',
		urlCtrlStyle: 'width:100px;'
	},

	urlCtrlVisible: false,
	urlCtrlWidget: undefined,

	initialize: function (options) {
		L.Util.setOptions(this, options);
	},

	toggleUrlCtrl: function() {
		this.urlCtrlVisible = !this.urlCtrlVisible;
		const urlCtrlWidget = L.DomUtil.get('urlCtrlWidget');
		// console.log({urlCtrlVisible: this.urlCtrlVisible, execCommand: document.execCommand});

		if (this.urlCtrlVisible) {
			const urlInput = L.DomUtil.get('urlInput');
			urlInput.value = window.location;
			urlCtrlWidget.setAttribute("style", "display:table;");
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

		const success = document.execCommand('copy');
		console.log(success);
	},

	onAdd: function (map) {
		const container = L.DomUtil.create('div', 'url-container', L.DomUtil.get('map'));
		container.setAttribute("style", this.options.style);

		const lbl = L.DomUtil.create('div', null, container);
		lbl.innerHTML = 'Copy url';
		lbl.setAttribute("style", "text-align:center;");
		lbl.setAttribute("title", "Click to show/hide the url copy widget");

		const root = L.DomUtil.create('div', 'input-group', container);
		root.setAttribute("id", "urlCtrlWidget");
		root.setAttribute("style", "display:none;");
		const input = L.DomUtil.create('input', 'form-control', root);
		input.setAttribute("id", "urlInput");
		input.setAttribute("type", "text");
		input.setAttribute("size", "50");
		const span = L.DomUtil.create('span', 'input-group-addon', root);
		const ico = L.DomUtil.create('span', 'glyphicon glyphicon-copy', span);
		ico.setAttribute("title", "Copy url to clipboard");

		this.urlCtrlWidget = root;

		L.DomEvent.on(container, 'click mousemove', L.DomEvent.stopPropagation);
		L.DomEvent.on(lbl, 'click', this.toggleUrlCtrl.bind(this));
		L.DomEvent.on(span, 'click', this.copyUrl);

		return container;
	},

	onRemove: function (map) {
		map.off('click', this.toggleUrlCtrl.bind(this));
	},
});