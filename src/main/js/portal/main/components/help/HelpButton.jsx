import React, { Component } from 'react';


const btnDefault = 'glyphicon glyphicon-question-sign text-info';
const btnActive = 'glyphicon glyphicon-remove-sign text-info';

const defaultIconStyle = {
	fontSize: 15,
	cursor: 'help',
	padding: 0,
	marginLeft: 10
};

export default class HelpButton extends Component {
	constructor(props){
		super(props);

		this.iconsStyle = Object.assign({}, defaultIconStyle, props.iconsStyle);
		this.btnDefault = props.btnDefault || btnDefault;
		this.btnActive = props.btnActive || btnActive;

		this.state = {
			isActive: false
		};
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.isActive !== this.state.isActive){
			this.setState({isActive: nextProps.isActive});
		}
	}

	handleBtnClick(){
		const {getResourceHelpInfo, options, helpItem} = this.props;

		if (getResourceHelpInfo){
			const uriList = options && options.length
				? options.map(d => d.value)
				: undefined;
			getResourceHelpInfo(helpItem, uriList);
		}
	}

	render(){
		const {helpItem, title} = this.props;
		if (helpItem === undefined) return null;

		const {isActive} = this.state;
		const className = isActive ? this.btnActive : this.btnDefault;

		return <span
			className={className}
			style={this.iconsStyle}
			title={title}
			onClick={this.handleBtnClick.bind(this)}
		/>;
	}
}