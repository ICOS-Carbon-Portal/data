import React, { Component} from 'react';

export default class CheckBtn extends Component {
	onClick() {
		this.props.grayDownloadFilterUpdate(!this.props.isChecked)
	}
	render(){
		const isChecked = this.props.isChecked || false;

		return(
			<input className="form-check-input" type="checkbox" onChange={this.onClick.bind(this)}
				checked={isChecked ?? "checked"}>
			</input>
		)
	}
}
