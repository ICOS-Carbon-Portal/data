import React, { Component } from 'react';
import CheckBtn from '../buttons/ChechBtn.jsx';


export default class CheckAllBoxes extends Component {
	render() {
		const props = this.props;
		const areAllChecked = props.checkCount > 0 ? "checked" : "";
		const checkAllBoxesStyle = {float: 'left', width: 40, margin: '4px'};
		if (!(props.checkCount === 0 || props.checkCount === props.totalCount)){
			Object.assign(checkAllBoxesStyle, {opacity: 0.5});
		}
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
