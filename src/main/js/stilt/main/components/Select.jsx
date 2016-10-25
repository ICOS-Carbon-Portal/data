import React from 'react';
import ReactDOM from 'react-dom';

export default function(props){

	const toStringValue = value => props.presenter ? props.presenter(value) : value;

	const availableValues = props.sort
		? (props.availableValues || []).sort((v1, v2) => {
			const s1 = toStringValue(v1);
			const s2 = toStringValue(v2);
			return s1 > s2 ? 1 : s1 < s2 ? -1 : 0;
		})
		: (props.availableValues || []);

	function changeHandler(event){
		const idx = event.target.selectedIndex;

		if (idx > 0){
			props.selectValue(availableValues[idx - 1]);
		}
	}

	const stringValues = [props.infoTxt].concat(availableValues.map(toStringValue));
	const current = toStringValue(props.value) || props.infoTxt;

	return <select value={current} className="form-control" onChange={changeHandler} {...props.options}>{
		stringValues.map(sv => <option key={sv} value={sv}>{sv}</option>)
	}</select>;
}

