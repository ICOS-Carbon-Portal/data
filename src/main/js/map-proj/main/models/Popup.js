export default class Popup{
	constructor(rootElementId, countriesLookupTbl){
		this._rootElement = document.getElementById(rootElementId);
		this._countriesLookupTbl = countriesLookupTbl;
		this._keys = ['Country', 'Site_type', 'Long_name', 'PI_names'];
	}

	reset(){
		this._rootElement.innerHTML = '';
	}

	addObject(headerTxt, props){
		const header = document.createElement("div");
		header.setAttribute("class", "ol-popup-header");
		header.innerHTML = headerTxt;
		this._rootElement.appendChild(header);

		const content = document.createElement("div");
		content.setAttribute("class", "ol-popup-content");

		this._keys.forEach(key => {
			if (props[key]) {
				const contentRecord = document.createElement("div");
				contentRecord.setAttribute("class", "ol-popup-content-record");

				const lbl = document.createElement("b");
				lbl.innerHTML = key.replace(/_/g, " ") + ": ";
				contentRecord.appendChild(lbl);

				const txt = document.createElement("span");
				txt.innerHTML = countries && key === 'Country'
					? this._countriesLookupTbl[props[key]] + ' (' + props[key] + ')'
					: props[key].replace(/;/g, ", ");
				contentRecord.appendChild(txt);

				content.appendChild(contentRecord);
			}
		});

		this._rootElement.appendChild(content);
	}

	addTxt(txt){
		const contentRecord = document.createElement("div");
		contentRecord.setAttribute("class", "ol-popup-content-record");
		contentRecord.innerHTML = txt;
		this._rootElement.appendChild(contentRecord);
	}

	get popupElement(){
		return this._rootElement;
	}
}