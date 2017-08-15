import React, { Component } from 'react';

export default class YesNoView extends Component {
	constructor(props) {
		super(props);
	}

	onYesClick(){
		if (this.props.actionYes) {
			const action = this.props.actionYes;
			action.fn.apply(this, action.args);
		}
	}

	onNoClick(){
		if (this.props.actionNo) {
			const action = this.props.actionNo;
			action.fn.apply(this, action.args);
		}
	}

	render(){
		const props = this.props;
		const {x, y} = props.mouseClick
			? {x: props.mouseClick.layerX, y: props.mouseClick.layerY}
			: {x: 0, y: 0};
		const style = this.props.visible
			? {
				position:'absolute',
				top: y,
				left: x,
				display:'inline',
				zIndex: 999,
				minWidth: 200,
				maxWidth: 400,
				boxShadow: '7px 7px 5px #888'
			}
			: {display: 'none'};

		return (
			<div className="panel panel-default" style={style}>
				<div className="panel-heading">
					<h3 className="panel-title">{props.title}</h3>
				</div>
				<div className="panel-body">
					<div style={{margin: '0px 0px 30px 0px'}}>
						{props.question}
					</div>
					<button className="btn btn-primary" onClick={this.onYesClick.bind(this)}>Yes</button>
					<button className="btn btn-primary" style={{float:'right'}} onClick={this.onNoClick.bind(this)}>No</button>
				</div>
			</div>
		);
	}
}