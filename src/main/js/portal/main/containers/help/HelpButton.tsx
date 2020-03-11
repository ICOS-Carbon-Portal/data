import React, {Component, CSSProperties, MouseEvent} from "react";
import {connect} from "react-redux";
import {State} from "../../models/State";
import {PortalDispatch} from "../../store";
import config, {CategoryType, NumberFilterCategories, numberFilterKeys, placeholders} from "../../config";
import {UrlStr} from "../../backend/declarations";
import {getObjectHelpInfo, getResourceHelpInfo} from "../../actions/search";


const defaultBtn = 'glyphicon glyphicon-question-sign text-info';
const activeBtn = 'glyphicon glyphicon-remove-sign text-info';

const defaultIconStyle: CSSProperties = {
	fontSize: 15,
	cursor: 'help',
	padding: 0,
	paddingLeft: 5
};

type HelpName = CategoryType | 'preview' | NumberFilterCategories
type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type IncomingProps = {
	name: HelpName,
	title?: string,
	url?: UrlStr
}
type OurProps = StateProps & DispatchProps & IncomingProps;


class HelpButton extends Component<OurProps> {

	handleBtnClick = (event: MouseEvent<HTMLSpanElement>) => {
		const {getResourceHelpInfo, getObjectHelpInfo, name, url} = this.props;

		if (url === undefined) {
			getResourceHelpInfo(name);

		} else {
			// Help for dropdown list items
			event.stopPropagation();
			getObjectHelpInfo(name, getTitle(name), url);
		}
	};

	render(){
		const {name, title, helpStorage, url} = this.props;
		if (name === undefined || !helpStorage.has(name)) return null;

		const className = helpStorage.isActive(name, url) ? activeBtn : defaultBtn;

		return <span
			className={className}
			style={defaultIconStyle}
			title={title}
			onClick={this.handleBtnClick.bind(this)}
		/>;
	}
}

const getTitle = (name: HelpName) => {
	return name === 'preview' || numberFilterKeys.includes(name as NumberFilterCategories)
		? ''
		: placeholders[config.envri][name as CategoryType];
};

function stateToProps(state: State){
	return {
		helpStorage: state.helpStorage
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		getResourceHelpInfo: (name: string) => dispatch(getResourceHelpInfo(name)),
		getObjectHelpInfo: (name: string, header: string, url: UrlStr) => dispatch(getObjectHelpInfo(name, header, url)),
	};
}

export default connect(stateToProps, dispatchToProps)(HelpButton);
