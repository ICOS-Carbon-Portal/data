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
			<React.Fragment>
				{ editMode ?
					<div className="panel-heading">
						<span className="panel-title">{editValue}</span>
						<EditCtrl
							self={this}
							iconSaveClass={iconSaveClass}
							iconSaveTooltip={iconSaveTooltip}
							editValue={editValue}
							saveClick={this.handleSaveClick.bind(this)}
						/>
					</div>
					:
					<div className="panel-heading" onClick={this.handleIconClick.bind(this)} style={{cursor: 'pointer'}} title={iconEditTooltip}>
						<span className="panel-title">{editValue}</span>
						<span
							className={iconEditClass}
							style={{float: 'left', margin: '3px 5px'}}
						/>
					</div>
				}
			</React.Fragment>
		);
	}
}

const EditCtrl = ({self, editValue, saveClick, iconSaveClass, iconSaveTooltip}) => {
	const style = {position: 'absolute', top: 5, left: 0, margin: '0 20px'};

	return (
		<form className="input-group" style={style} onSubmit={saveClick}>
			<input
				ref={input => self.editCtrl = input}
				type="text"
				className="form-control"
				defaultValue={editValue}
				autoFocus
			/>
			<span className="input-group-btn">
				<button className="btn btn-primary" onClick={saveClick} title={iconSaveTooltip}>
					<span className={iconSaveClass} />
				</button>
			</span>
		</form>
	);
};
