export const wdcggPriorityList = ["PARAMETER", "MEASUREMENT UNIT", "STATION NAME", "TIME INTERVAL", "SAMPLING TYPE", "SAMPLING START"];

export function composeWdcggLabels(labelLists){
	return composeUniqueLabels(wdcggPriorityList, labelLists, ', ', 2);
}

export function composeUniqueLabels(priorityList, labelLists, separator = ' ', requiredLabels = 0){
	let labels = Array(labelLists.length).fill("");

	function getComponents(labelIndex){
		return labelLists.map(ll => getComponent(priorityList[labelIndex], ll));
	}

	for(let i = 0; i < priorityList.length && (!allDifferent(labels) || i < requiredLabels); i++){

		const components = getComponents(i);

		if(!allIdentical(components) || i < requiredLabels){
			labels = labels.map(
				(l, j) => l ? [l, components[j]].join(separator) : components[j]
			);
		}
	}

	if(labels.every(l => !l)){
		labels = getComponents(0);
	}

	if(!allDifferent(labels)){
		labels = labels.map((l, j) => [l, j + 1].join('_'));
	}

	return labels;
}

function getComponent(label, labelList){
	const labelObject = labelList.find(lobj => lobj.label === label);
	return labelObject ? labelObject.value : "";
}

function allDifferent(strings){
	if(!strings || !(strings.length)) return true;

	for(let i = 0; i < strings.length - 1; i++){

		for(let j = i + 1; j < strings.length; j++){

			if(strings[i] === strings[j]) return false;
		}
	}

	return true;
}

function allIdentical(strings){
	if(!strings || !(strings.length)) return true;

	const first = strings[0];

	for(let i = 1; i < strings.length; i++){

		if(strings[i] !== first) return false;
	}

	return true;
}

