import React, { Component } from 'react';


const baseStyle = {
	transition: 'margin-right 0.5s ease-in-out',
	float: 'right'
};

export default class SlideIn extends Component {
	constructor(props){
		super(props);
	}

	render(){
		const {width, children, isOpen} = this.props;
		const marginRight = isOpen ? {marginRight: 0} : {marginRight: -width};
		const style = Object.assign({}, baseStyle, marginRight);

		return (
			<div style={style}>
				{children}
			</div>
		);
	}
}
