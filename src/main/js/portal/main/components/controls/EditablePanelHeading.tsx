import React, { Component, CSSProperties, FormEvent, RefObject } from 'react';

type Props = {
	editValue: string
	defaultShownValue?: string
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

	handleSaveClick(event: FormEvent){
		if (this.editCtrl.current && this.editCtrl.current.value !== this.props.editValue) {
			this.props.saveValueAction(this.editCtrl.current.value);
		}
		this.setState({editMode: false});
		event.preventDefault();
	}

	render(){
		const {editMode} = this.state;
		const { editValue, iconEditClass, iconEditTooltip, iconSaveClass,
			iconSaveTooltip, defaultShownValue } = this.props;
		const style: CSSProperties = { position: 'absolute', top: 0, left: -20, margin: '0 20px' };
		const cardTitle = (defaultShownValue && !editValue) ? defaultShownValue : editValue;
		return (
			<>
				{ editMode ?
					<div className="card-header">
						<span className="card-title">{cardTitle}</span>
						<form className="input-group" style={style} onSubmit={this.handleSaveClick.bind(this)}>
							<input
								ref={this.editCtrl}
								type="text"
								className="form-control"
								defaultValue={editValue}
								placeholder={cardTitle}
								autoFocus
							/>
							<button type="submit" className="btn btn-primary" title={iconSaveTooltip}>
								<span className={iconSaveClass} />
							</button>
						</form>
					</div>
					:
					<div className="card-header" onClick={this.handleIconClick.bind(this)} style={{cursor: 'pointer'}} title={iconEditTooltip}>
						<div className="d-inline-block mt-1">
							<span className={iconEditClass + " me-2"}/>
							<span className="card-title">{cardTitle}</span>
						</div>
						<button className="btn btn-primary float-end" title={iconEditTooltip}>
							{iconEditTooltip}
						</button>
					</div>
				}
			</>
		);
	}
}
