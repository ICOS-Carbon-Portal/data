import React, {Component} from "react";
import { State} from "../../models/State";
import {PortalDispatch} from "../../store";
import {getFilterHelpInfo} from "../../actions/search";
import {connect} from "react-redux";
import HelpSection from "../../components/help/HelpSection";
import { HelpItemName } from "../../models/HelpStorage";

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = StateProps & DispatchProps;

class Help extends Component<OurProps> {

	render(){
		const {helpStorage, getFilterHelpInfo} = this.props;

		return (
			<HelpSection
				width={300}
				helpStorage={helpStorage}
				getFilterHelpInfo={getFilterHelpInfo}
			/>
		);
	}
}

function stateToProps(state: State){
	return {
		helpStorage: state.helpStorage
	};
}

function dispatchToProps(dispatch: PortalDispatch){
	return {
		getFilterHelpInfo: (name: HelpItemName) => dispatch(getFilterHelpInfo(name))
	};
}

export default connect(stateToProps, dispatchToProps)(Help);
