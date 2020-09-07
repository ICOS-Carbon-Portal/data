import React, {Component, CSSProperties, MouseEvent} from "react";
import {connect} from "react-redux";
import {State} from "../../models/State";
import {PortalDispatch} from "../../store";
import {UrlStr} from "../../backend/declarations";
import {getResourceHelpInfo, getFilterHelpInfo} from "../../actions/search";
import { HelpItemName } from "../../models/HelpStorage";


const defaultBtn = 'glyphicon glyphicon-question-sign text-info';
const activeBtn = 'glyphicon glyphicon-remove-sign text-info';

const defaultIconStyle: CSSProperties = {
	fontSize: 15,
	cursor: 'help',
	padding: 0,
	paddingLeft: 5
};

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type IncomingProps = {
	name: HelpItemName,
	title?: string,
	url?: UrlStr
}
type OurProps = StateProps & DispatchProps & IncomingProps;


class HelpButton extends Component<OurProps> {

	handleBtnClick = (event: MouseEvent<HTMLSpanElement>) => {
		const {getFilterHelpInfo, getResourceHelpInfo, name, url} = this.props;

		if (url === undefined) {
			getFilterHelpInfo(name);

		} else {
			// Help for dropdown list items
			event.stopPropagation();
			getResourceHelpInfo(name, url);
		}
	};

	render(){
		const {name, title, helpStorage, url} = this.props;

		if (name === undefined || !helpStorage.getHelpItem(name)) return null;

		const className = helpStorage.isActive(url ?? name) ? activeBtn : defaultBtn;

		return <span
			className={className}
			style={defaultIconStyle}
			title={title}
			onClick={this.handleBtnClick.bind(this)}
		/>;
	}
}

function stateToProps(state: State){
	return {
		helpStorage: state.helpStorage
	};
}

function dispatchToProps(dispatch: PortalDispatch){
	return {
		getFilterHelpInfo: (name: HelpItemName) => dispatch(getFilterHelpInfo(name)),
		getResourceHelpInfo: (name: HelpItemName, url: UrlStr) => dispatch(getResourceHelpInfo(name, url)),
	};
}

export default connect(stateToProps, dispatchToProps)(HelpButton);
