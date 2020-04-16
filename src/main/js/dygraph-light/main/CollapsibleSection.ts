import {Obj} from "../../common/main/types";
import {Style} from "../../common/main/style";

type Styles = {
	details: string
	summary: string
	anchor: string
}

export default class CollapsibleSection {
	private details: HTMLElement;
	private summary: HTMLElement;
	private content: HTMLElement;

	constructor(anchorId: string, title: string, styles: Styles, isClosed: boolean, setHidden = false){
		this.details = document.createElement('details');
		if (isClosed === null) this.details.setAttribute('open', '');
		this.details.setAttribute('style', styles.details);
		if (setHidden) this.hide();

		this.summary = document.createElement('summary');
		this.summary.setAttribute('style', styles.summary);
		this.summary.innerText = title;
		this.details.appendChild(this.summary);

		// Move anchor element into details element
		const anchorElement = document.getElementById(anchorId)!;
		this.content = anchorElement.cloneNode() as HTMLElement;
		this.content.setAttribute('style', styles.anchor);
		anchorElement.removeAttribute('id');

		anchorElement.appendChild(this.details);
		this.details.appendChild(this.content);
	}

	setPosition(position: Style){
		Object.keys(position).forEach(key => this.details.style.setProperty(key, (position as Obj)[key] + "px"));
	}

	hide(){
		this.details.style.display = "none";
	}

	show(){
		this.details.style.display = "inline";
	}

	updateSummary(title: string){
		this.summary.innerText = title;
	}

	updateContent(content: string){
		this.content.innerHTML = content;
	}
}
