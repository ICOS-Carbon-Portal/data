import React, { Component } from 'react';

export default class BackButton extends Component {
	constructor(props){
		super(props);
	}

	render(){
		return (
			<div>
				{this.props.action ?
					<div onClick={this.props.action.bind(this, this.props.previousRoute)} style={{cursor: 'pointer', marginBottom: 10}}>
						<span className="glyphicon glyphicon-menu-left"/>
						<span style={{marginLeft: 5}}>Back to {this.props.previousRoute}</span>
					</div>
					:
					<span />
				}
			</div>
		);
	}
}
