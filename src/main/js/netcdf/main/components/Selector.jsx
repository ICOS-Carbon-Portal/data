import React, { Component } from 'react';

export default class Selector extends Component {
	constructor(props) {
		super(props);
	}

	changeHandler(){
		const props = this.props;
		const idx = this.selector.selectedIndex;
		props.action(idx);
	}

	render(){
		const props = this.props;
		const control = props.control;
		const selectedOption = control.hasSelected ? control.selected : props.caption;
		const style = {visibility: control.hasSelected ? "visible" : "hidden"};
		const optionTexter = value => props.presenter ? props.presenter(value) : value;

		return <div className={props.className} style={style}>

			<span style={{fontWeight: 'bold'}}>{props.caption + ": "}</span>

			<select ref={select => this.selector = select} value={optionTexter(selectedOption)} className="form-select" onChange={this.changeHandler.bind(this)}>{

				control.values.map(function(optionValue, i){
					return <option key={i}>{optionTexter(optionValue)}</option>;
				})

			}</select>

		</div>;
	}
}
