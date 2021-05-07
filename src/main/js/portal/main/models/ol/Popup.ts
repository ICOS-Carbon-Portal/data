import Overlay from "ol/Overlay";
import { Obj } from "../../../../common/main/types";


export default class Popup {
	private rootElement: HTMLElement;

	constructor(rootElementId: string, public readonly popupOverlay?: Overlay) {
		const rootElement = document.getElementById(rootElementId);
		if (rootElement === null)
			throw new Error(`Could not find html element with id = ${rootElementId} in DOM`);
		this.rootElement = rootElement
	}

	reset() {
		this.rootElement.innerHTML = '';
	}

	addContent(headerTxt: string, rowsAndCols: Obj) {
		const header = document.createElement("div");
		header.setAttribute("class", "ol-popup-header");
		header.innerHTML = headerTxt;
		this.rootElement.appendChild(header);

		const content = document.createElement("div");
		content.setAttribute("class", "ol-popup-content");

		Object.keys(rowsAndCols).forEach(key => {
			if (rowsAndCols[key] !== undefined && rowsAndCols[key] !== null) {
				const contentRecord = document.createElement("div");
				contentRecord.setAttribute("class", "ol-popup-content-record");

				const lbl = document.createElement("b");
				lbl.innerHTML = key.replace(/_/g, " ") + ": ";
				contentRecord.appendChild(lbl);

				const txt = document.createElement("span");
				txt.innerHTML = rowsAndCols[key] + '';
				contentRecord.appendChild(txt);

				content.appendChild(contentRecord);
			}
		});

		this.rootElement.appendChild(content);
	}

	addTxtToContent(txt: string) {
		const contentRecord = document.createElement("div");
		contentRecord.setAttribute("class", "ol-popup-content-record");
		contentRecord.innerHTML = txt;
		this.rootElement.appendChild(contentRecord);
	}

	get popupElement() {
		return this.rootElement;
	}
}
