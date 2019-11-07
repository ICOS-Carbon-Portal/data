import React, { Component, MouseEvent } from 'react';
import {Style} from "../../../../common/main/style";


interface Props {
	onClick: (event: MouseEvent<HTMLButtonElement>) => void
	title?: string
	isChecked?: boolean
	checkboxDisabled?: boolean
	style?: Style
}

export default class CheckBtn extends Component<Props>{
	render(){
		const onClick = this.props.onClick;
		const title = this.props.title || '';
		const isChecked = this.props.isChecked || false;
		const checkboxDisabled = this.props.checkboxDisabled || false;
		const style = this.props.style || {};
		const btnStyle = Object.assign({pointerEvents:'auto', padding:'0px 3px'}, style);
		if (checkboxDisabled) Object.assign(btnStyle, {backgroundColor:'rgb(216, 216, 216)', borderColor:'rgb(114, 114, 114)'});

		return(
			<button className="btn btn-default" style={btnStyle} onClick={onClick} title={title} disabled={checkboxDisabled}>
				<span className="glyphicon glyphicon-ok" style={{opacity: isChecked ? 1 : 0}} />
			</button>
		);
	}
}
