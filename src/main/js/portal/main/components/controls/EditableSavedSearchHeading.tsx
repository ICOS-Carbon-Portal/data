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

export default class EditablSavedSearchHeading extends Component<Props, State>{
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
		const style: CSSProperties = { position: 'absolute', top: 0, left: -20, margin: '0 20px' };

		return (
			<>
				{ editMode ?
					<div className="card-header">
						<span className="card-title">{editValue}</span>
						<form className="input-group" style={style} onSubmit={this.handleSaveClick.bind(this)}>
							<input
								ref={this.editCtrl}
								type="text"
								className="form-control"
								defaultValue={editValue}
								autoFocus
							/>
							<button className="btn btn-primary" onClick={this.handleSaveClick.bind(this)} title={iconSaveTooltip}>
								<span className={iconSaveClass} />
							</button>
						</form>
					</div>
					:
					<div className="card-header" onClick={this.handleIconClick.bind(this)} style={{cursor: 'pointer'}} title={iconEditTooltip}>
						<span className="card-title">{editValue}</span>
						<span
							className={iconEditClass}
							style={{float: 'left', margin: '3px 5px'}}
						/>
					</div>
				}
			</>
		);
	}
}
