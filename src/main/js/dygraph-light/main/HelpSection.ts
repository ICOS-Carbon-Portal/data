import {getCssText, Style} from "../../common/main/style";

export const addHelpSection = (rootDiv: HTMLDivElement) => {
	const pDiv = document.createElement('p');
	pDiv.innerHTML = 'The graph can be navigated with zoom and pan.';
	rootDiv.appendChild(pDiv);

	const ul = document.createElement('ul');
	ul.setAttribute('class', 'dashed');

	ul.appendChild(getLi('Zoom', 'Use mouse left to drag an area in the graph. You can drag horizontally or vertically.'));
	ul.appendChild(getLi('Pan', 'Hold SHIFT and use mouse left to drag/pan in the graph.'));
	ul.appendChild(getLi('Reset', 'Double click in the graph to reset zoom/pan.'));

	rootDiv.appendChild(ul);

	rootDiv.setAttribute('style', getCssText(rootDivStyle));
};

const getLi = (header: string, txt: string) => {
	const li = document.createElement('li');

	const bold = document.createElement('b');
	bold.innerHTML = header + ": ";
	li.appendChild(bold);

	const span = document.createElement('span');
	span.innerHTML = txt;
	li.appendChild(span);

	return li;
};

const rootDivStyle: Style = {
	fontSize: '80%',
	maxWidth: 300,
	padding: 10
};
