import React, { Component } from 'react';

export default class EditablePanelHeading extends Component{
	constructor(props){
		super(props);
		this.state = {
			editMode: false
		};
	}

	handleIconClick(){
		this.setState({editMode: true});
	}

	handleSaveClick(){
		if (this.editCtrl.value !== this.props.editValue) {
			this.props.saveValueAction(this.editCtrl.value);
		}
		this.setState({editMode: false});
	}

	render(){
		const {editMode} = this.state;
		const {editValue, iconEditClass, iconEditTooltip, iconSaveClass, iconSaveTooltip} = this.props;

		return (
			<div className="panel-heading">
				<span className="panel-title">{editValue}</span>{
				editMode
					? <EditCtrl
						self={this}
						iconSaveClass={iconSaveClass}
						iconSaveTooltip={iconSaveTooltip}
						editValue={editValue}
						saveClick={this.handleSaveClick.bind(this)}
					/>
					: <span
						className={iconEditClass}
						title={iconEditTooltip}
						onClick={this.handleIconClick.bind(this)}
						style={{float: 'right', fontSize: '170%', cursor: 'pointer'}}
					/>
			}</div>
		);
	}
}

const EditCtrl = ({self, editValue, saveClick, iconSaveClass, iconSaveTooltip}) => {
	const style = {position: 'absolute', top: 5, left: 0, margin: '0 20px'};

	return (
		<span className="input-group" style={style}>
			<input
				ref={input => self.editCtrl = input}
				type="text"
				className="form-control"
				defaultValue={editValue}
			/>
			<span className="input-group-btn">
				<button className="btn btn-primary" onClick={saveClick} title={iconSaveTooltip}>
					<span className={iconSaveClass} />
				</button>
			</span>
		</span>
	);
};
