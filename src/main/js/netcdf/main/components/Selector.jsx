import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';

class Selector extends React.Component {
	constructor(props) {
		super(props);
	}

	changeHandler(){
		const props = this.props;
		const idx = ReactDOM.findDOMNode(this.refs.selector).selectedIndex;
		props.action(idx);
	}

	render(){
		const props = this.props;
		const control = props.control;
		const selectedOption = control.hasSelected ? control.selected : props.caption;
		const style = {visibility: control.hasSelected ? "visible" : "hidden"};

		return <div className={props.className} style={style}>

			<span style={{fontWeight: 'bold'}}>{props.caption + ": "}</span>

			<select ref="selector" value={selectedOption} className="form-control" onChange={this.changeHandler.bind(this)}>{

				control.values.map(function(optionValue, i){
					return <option key={optionValue}>{optionValue}</option>;
				})

			}</select>

		</div>;
	}
}

export default Selector;