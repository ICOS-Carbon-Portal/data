export default class CollapsibleSection{
	constructor(anchorId, title, styles, isClosed, setHidden = false){
		this.details = document.createElement('details');
		if (isClosed === null) this.details.setAttribute('open', '');
		this.details.setAttribute('style', styles.details);
		if (setHidden) this.hide();

		this.summary = document.createElement('summary');
		this.summary.setAttribute('style', styles.summary);
		this.summary.innerText = title;
		this.details.appendChild(this.summary);

		// Move anchor element into details element
		const legend = document.getElementById(anchorId);
		const legendClone = legend.cloneNode();
		legendClone.setAttribute('style', styles.anchor);
		legend.removeAttribute('id');

		legend.appendChild(this.details);
		this.details.appendChild(legendClone);
	}

	setPosition(top, left){
		this.details.style.top = top + "px";
		this.details.style.left = left + "px";
	}

	hide(){
		this.details.style.display = "none";
	}

	show(){
		this.details.style.display = "inline";
	}
}