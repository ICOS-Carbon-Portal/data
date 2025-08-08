import React, {Component, type CSSProperties, type MouseEvent} from "react";
import {connect} from "react-redux";
import {type State} from "../../models/State";
import {type PortalDispatch} from "../../store";
import {type UrlStr} from "../../backend/declarations";
import {getFilterHelpInfo, type HelpContent, setFilterHelpInfo} from "../../actions/search";
import {type HelpItemName} from "../../models/HelpStorage";
import {type ColNames} from "../../models/CompositeSpecTable";


const defaultBtn = "fas fa-question-circle";
const activeBtn = "fas fa-times-circle";

const defaultIconStyle: CSSProperties = {
	fontSize: 15,
	cursor: "help",
	padding: 0,
	paddingLeft: 5
};

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type IncomingProps = {
	name: ColNames | HelpItemName
	title?: string
	url?: UrlStr
	helpContent?: HelpContent
	overrideStyles?: CSSProperties
};
type OurProps = StateProps & DispatchProps & IncomingProps;


class HelpButton extends Component<OurProps> {
	handleBtnClick = (event: MouseEvent<HTMLSpanElement>) => {
		const {getFilterHelpInfo, setFilterHelpInfo, name, helpContent} = this.props;

		if (helpContent === undefined) {
			getFilterHelpInfo(name);
		} else {
			event.stopPropagation();
			setFilterHelpInfo(name, helpContent);
		}
	};

	render() {
		const {name, title, helpStorage, url} = this.props;
		const styles = {...defaultIconStyle, ...this.props.overrideStyles};

		if (name === undefined || !helpStorage.getHelpItem(name)) {
			return null;
		}

		const className = helpStorage.isActive(url ?? name) ? activeBtn : defaultBtn;

		return <span
			className={className}
			style={styles}
			title={title}
			onClick={this.handleBtnClick.bind(this)}
		/>;
	}
}

function stateToProps(state: State) {
	return {
		helpStorage: state.helpStorage
	};
}

function dispatchToProps(dispatch: PortalDispatch) {
	return {
		getFilterHelpInfo: (name: ColNames | HelpItemName) => dispatch(getFilterHelpInfo(name)),
		setFilterHelpInfo: (name: ColNames | HelpItemName, helpContent: HelpContent) => dispatch(setFilterHelpInfo(name, helpContent)),
	};
}

export default connect(stateToProps, dispatchToProps)(HelpButton);
