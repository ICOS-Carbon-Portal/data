import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';

class Selector extends React.Component {
	constructor(props) {
		super(props);
	}

	// componentWillReceiveProps(nextProps){
	// 	const prevProps = this.props;
	// 	// console.log({prevProps, nextProps});
	// }

	changeHandler(){
		const props = this.props;
		const idx = ReactDOM.findDOMNode(this.refs.selector).selectedIndex;
		props.action(idx);
	}

	render(){
		const props = this.props;
		const control = props.control;
		const selectedOption = control.values[control.selectedIdx];
		const style = {display: control.hasSelected ? "inline" : "none"};

		// console.log({state: this.state, props: this.props, selectedOption, hasSelected: control.hasSelected});

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