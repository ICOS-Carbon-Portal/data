import React, { Component } from 'react';

export default class CheckBtn extends Component{
	constructor(props){
		super(props);
	}

	handleCheckboxChange(id) {
		this.props.updateCheckedObjects(id);
	}

	render(){
		const {id, isChecked, checkboxDisabled, title} = this.props;
		const style = Object.assign({pointerEvents:'auto', padding:'0px 3px'}, this.props.style);
		if (checkboxDisabled) Object.assign(style, {backgroundColor:'rgb(216, 216, 216)', borderColor:'rgb(114, 114, 114)'});
		const onClick = this.handleCheckboxChange.bind(this, id);

		return(
			<button className="btn btn-default" style={style} onClick={onClick} title={title} disabled={checkboxDisabled}>
				<span className="glyphicon glyphicon-ok" style={{opacity: isChecked ? 1 : 0}} />
			</button>
		);
	}
}
