import React, { Component } from 'react';

export default class EditablePanelHeading extends Component{
	constructor(props){
		super(props);
		this.state = {
			editMode: false,
			editText: undefined
		};
		this.editText = undefined;
	}

	componentWillUpdate(nextProps){
		if (this.editText === undefined && nextProps.cart) this.editText = nextProps.cart.name;
	}

	handleIconClick(){
		this.setState({editMode: !this.state.editMode});
	}

	render(){
		const {editMode} = this.state;
		const {cart, iconClass, iconTooltip} = this.props;
		// console.log({editMode, cart, iconClass, iconTooltip});

		return (
			<div className="panel-heading">
				<span className="panel-title">{cart.name}</span>
				<span
					className={iconClass}
					title={iconTooltip}
					onClick={this.handleIconClick.bind(this)}
					style={{float: 'right', fontSize: '170%', cursor: 'pointer'}}
				/>
			</div>
		);
	}
}