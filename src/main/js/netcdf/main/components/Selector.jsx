import React, { Component } from 'react';

export default class Selector extends Component {
	constructor(props) {
		super(props);
	}

	render(){
		const props = this.props;
		const control = props.control;

		const style = {visibility: (control.values.length > 0) ? "visible" : "hidden"};

		const selectedOption = control.selected === null ? props.caption : control.selected;

		const optionTexter = props.presenter || (v => v);

		function changeHandler(event){
			if(props.action) props.action(event.target.selectedIndex);
		}

		return <div className={props.className} style={style}>

			<span style={{fontWeight: 'bold'}}>{props.caption + ": "}</span>

			<select value={optionTexter(selectedOption)} className="form-select" onChange={changeHandler}>{

				control.values.map(function(optionValue, i){
					return <option key={i}>{optionTexter(optionValue)}</option>;
				})

			}</select>

		</div>;
	}
}
