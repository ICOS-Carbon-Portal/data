import React from 'react';
import ReactDOM from 'react-dom';

export default function(props){

	function changeHandler(event){
		const idx = event.target.selectedIndex;

		if (idx > 0){
			props.selectValue(props.availableValues[idx - 1]);
		}
	}

	const toStringValue = value => props.presenter ? props.presenter(value) : value;
	const stringValues = [props.infoTxt].concat((props.availableValues || []).map(toStringValue));
	const current = toStringValue(props.value) || props.infoTxt;

	return <select value={current} className="form-control" onChange={changeHandler} {...props.options}>{
		stringValues.map(sv => <option key={sv} value={sv}>{sv}</option>)
	}</select>;
}

