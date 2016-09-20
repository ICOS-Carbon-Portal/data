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
	const noValue = "49djs8fjsal38t";
	const current = toStringValue(props.value) || noValue;

	return <select value={current} className="form-control" onChange={changeHandler} {...props.options}>
		<option value={noValue}>{props.infoTxt}</option>
		{
			(props.availableValues || []).map(toStringValue).map(
				value => <option key={value} value={value}>{value}</option>
			)
		}
	</select>;
}

