import React, {Component, CSSProperties, Fragment, MouseEvent} from 'react';
import { connect } from 'react-redux';
import {State} from "../../models/State";
import {PortalDispatch} from "../../store";
import {updateSearchOption, updateSelectedPids} from "../../actions/search";
import {Sha256Str} from "../../backend/declarations";
import {SearchOption} from "../../actions/types";
import FilterByPid from "../../components/filters/FilterByPid";
import {Style} from "../../../../common/main/style";
import CheckBtn from "../../components/buttons/ChechBtn";
import {FilterPanel} from "../../components/filters/FilterPanel";

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = StateProps & DispatchProps & {tabHeader: string};

class Advanced extends Component<OurProps> {
	render(){
		const {searchOptions, updateSearchOption, filterPids, updateSelectedPids} = this.props;
		const {showDeprecated} = searchOptions;
		const deprecationDisabled: boolean = filterPids.length > 0;

		return (
			<Fragment>
				<FilterPanel header="Free text filters">
					<FilterByPid
						selectedPids={filterPids}
						updateSelectedPids={updateSelectedPids}
					/>
				</FilterPanel>

				<FilterPanel header="Search options">
					<CheckButton
						checkboxDisabled={deprecationDisabled}
						onClick={() => updateSearchOption({name: 'showDeprecated', value: !showDeprecated})}
						isChecked={showDeprecated}
						text={'Show deprecated objects'}
					/>
				</FilterPanel>
			</Fragment>
		);
	}
}

interface CheckButton {
	onClick: (event: MouseEvent<HTMLButtonElement>) => void
	isChecked: boolean
	text: string
	checkboxDisabled?: boolean
	styleBtn?: Style
	styleTxt?: Style
}

const CheckButton = (props: CheckButton) => {
	const {onClick, isChecked, text} = props;
	const checkboxDisabled = props.checkboxDisabled || false;
	const defaultStyleBtn = {margin:0, fontSize:12};
	const styleBtn: Style = props.styleBtn
		? Object.assign(defaultStyleBtn, props.styleBtn)
		: defaultStyleBtn;
	const defaultStyleTxt: CSSProperties = {marginLeft:5, top:1, position:'relative'};
	const styleTxt: Style = props.styleTxt
		? Object.assign(defaultStyleTxt, props.styleTxt)
		: defaultStyleTxt;

	return (
		<div style={{marginTop:15}}>
			<CheckBtn onClick={onClick} isChecked={isChecked} style={styleBtn} checkboxDisabled={checkboxDisabled} />
			<span style={styleTxt}>{text}</span>
		</div>
	);
};

function stateToProps(state: State){
	return {
		filterPids: state.filterPids,
		searchOptions: state.searchOptions,
	};
}

function dispatchToProps(dispatch: PortalDispatch){
	return {
		updateSelectedPids: (pids: Sha256Str[]) => dispatch(updateSelectedPids(pids)),
		updateSearchOption: (searchOption: SearchOption) => dispatch(updateSearchOption(searchOption)),
	};
}

export default connect(stateToProps, dispatchToProps)(Advanced);
