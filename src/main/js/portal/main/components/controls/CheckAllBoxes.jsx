import React, { Component } from 'react';

export default class CheckAllBoxes extends Component {
	render() {
		const props = this.props;
		const areAllChecked = props.checkCount > 0 ? "checked" : "";
		const checkAllBoxesStyle =
		(props.checkCount == 0
			|| props.checkCount == props.totalCount)
			? {float: 'left', width: 40, margin: '5px 0', textAlign: 'center'}
			: {float: 'left', width: 40, margin: '5px 0', textAlign: 'center', opacity: 0.5};
		const checkAllBoxesTitle = props.checkCount > 0 ? "Select none" : "Select all";

		return <div style={checkAllBoxesStyle}>
			<input className="data-all-checkboxes"
				type="checkbox"
				name="data-all-checkboxes"
				onChange={props.onChange}
				checked={areAllChecked}
				title={checkAllBoxesTitle} />
		</div>;
	}
}
