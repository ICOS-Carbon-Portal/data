import React, { Component } from 'react';
import CheckBtn from '../buttons/ChechBtn.jsx';


export default class CheckAllBoxes extends Component {
	render() {
		const props = this.props;
		const areAllChecked = props.checkCount > 0 ? "checked" : "";
		const checkAllBoxesStyle = (props.checkCount === 0 || props.checkCount === props.totalCount)
			? {float: 'left', width: 40, margin: '4px 2px'}
			: {float: 'left', width: 40, margin: '4px 2px', opacity: 0.5};
		const checkAllBoxesTitle = props.checkCount > 0 ? "Select none" : "Select all";

		return (
			<div style={checkAllBoxesStyle}>
				<CheckBtn
					updateCheckedObjects={props.onChange}
					isChecked={areAllChecked}
					checkboxDisabled={""}
					title={checkAllBoxesTitle}
				/>
			</div>
		);
	}
}
