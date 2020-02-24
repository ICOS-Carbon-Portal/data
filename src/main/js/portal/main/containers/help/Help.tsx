import React, {Component} from "react";
import { State} from "../../models/State";
import {PortalDispatch} from "../../store";
import {getResourceHelpInfo} from "../../actions/search";
import {connect} from "react-redux";
import HelpSection from "../../components/help/HelpSection";

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = StateProps & DispatchProps;

class Help extends Component<OurProps> {

	render(){
		const {helpStorage, getResourceHelpInfo} = this.props;

		return (
			<HelpSection
				width={300}
				helpStorage={helpStorage}
				getResourceHelpInfo={getResourceHelpInfo}
			/>
		);
	}
}

function stateToProps(state: State){
	return {
		helpStorage: state.helpStorage
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		getResourceHelpInfo: (name: string) => dispatch(getResourceHelpInfo(name))
	};
}

export default connect(stateToProps, dispatchToProps)(Help);
