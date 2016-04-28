import React, { Component, PropTypes } from 'react'

class Select extends Component {
	constructor(props){
		super(props)
	}

	indChanged(event) {
		if (event.target.selectedIndex > 0){
			this.props.indexChanged(event.target.selectedIndex);
		}
	}

	render() {
		const props = this.props;
		const optionTexts = [props.title].concat(props.options);

		return <select onChange={this.indChanged.bind(this)} value={props.selectedIndex}
			   className={props.className}
			   size={props.size}>{
			optionTexts.map(function (optionText, i) {
				return <option key={i} value={i}>{optionText}</option>;
			})
		}</select>;
	}
}

Select.propTypes = {
	title: PropTypes.string.isRequired,
	options: PropTypes.arrayOf(PropTypes.string).isRequired,
	indexChanged: PropTypes.func.isRequired,
	selectedIndex: PropTypes.number.isRequired
}

export default Select;