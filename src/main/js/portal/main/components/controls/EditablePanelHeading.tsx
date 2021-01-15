import React, { Component, CSSProperties, RefObject } from 'react';

type Props = {
	editValue: string
	saveValueAction: (newName: string) => void
	iconEditClass: string
	iconEditTooltip: string
	iconSaveClass: string
	iconSaveTooltip: string
}

type State = {
	editMode: boolean
}

export default class EditablePanelHeading extends Component<Props, State>{
	private editCtrl: RefObject<HTMLInputElement>;

	constructor(props: Props){
		super(props);

		this.editCtrl = React.createRef<HTMLInputElement>();

		this.state = {
			editMode: false
		};
	}

	handleIconClick(){
		this.setState({editMode: true});
	}

	handleSaveClick(){
		if (this.editCtrl.current && this.editCtrl.current.value !== this.props.editValue) {
			this.props.saveValueAction(this.editCtrl.current.value);
		}
		this.setState({editMode: false});
	}

	render(){
		const {editMode} = this.state;
		const { editValue, iconEditClass, iconEditTooltip, iconSaveClass, iconSaveTooltip } = this.props;
		const style: CSSProperties = { position: 'absolute', top: 5, left: 0, margin: '0 20px' };

		return (
			<React.Fragment>
				{ editMode ?
					<div className="panel-heading">
						<span className="panel-title">{editValue}</span>
						<form className="input-group" style={style} onSubmit={this.handleSaveClick.bind(this)}>
							<input
								ref={this.editCtrl}
								type="text"
								className="form-control"
								defaultValue={editValue}
								autoFocus
							/>
							<span className="input-group-btn">
								<button className="btn btn-primary" onClick={this.handleSaveClick.bind(this)} title={iconSaveTooltip}>
									<span className={iconSaveClass} />
								</button>
							</span>
						</form>
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
