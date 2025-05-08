import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Value} from "../../models/SpecTable";
import {State} from "../../models/State";
import {PortalDispatch} from "../../store";
import {ColNames} from "../../models/CompositeSpecTable";
import {
	setNumberFilter,
	setFilterTemporal,
	specFilterUpdate,
	setKeywordFilter
} from "../../actions/search";
import {PanelsWithFilters} from "../../components/filters/PanelsWithFilters";
import {FilterNumber} from "../../models/FilterNumbers";
import FilterTemporal from "../../models/FilterTemporal";


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type incommingProps = {
	tabHeader: string
	handleFilterReset: () => void
}
type OurProps = StateProps & DispatchProps & incommingProps;

class Filters extends Component<OurProps> {
	render(){
		const {
			specTable, filterTemporal, helpStorage, labelLookup, updateFilter, handleFilterReset,
			setFilterTemporal, filterPids, setNumberFilter, filterNumbers, scopedKeywords, filterKeywords,
			setKeywordFilter, countryCodesLookup, spatialRects
		} = this.props;

		const resetBtnEnabled = filterTemporal.hasFilter
			|| specTable.hasActiveFilters
			|| filterNumbers.hasFilters
			|| filterKeywords.length > 0
			|| filterPids !== null
			|| (!!spatialRects && spatialRects.length > 0)

		return (
			<div>
				<ResetBtn enabled={resetBtnEnabled} resetFiltersAction={handleFilterReset} />

				<PanelsWithFilters
					filterNumbers={filterNumbers}
					specTable={specTable}
					helpStorage={helpStorage}
					labelLookup={labelLookup}
					countryCodesLookup={countryCodesLookup}
					updateFilter={updateFilter}
					setNumberFilter={setNumberFilter}
					filterTemporal={filterTemporal}
					setFilterTemporal={setFilterTemporal}
					scopedKeywords={scopedKeywords}
					filterKeywords={filterKeywords}
					setKeywordFilter={setKeywordFilter}
					startCollapsed={false}
				/>

			</div>
		);
	}
}

interface ResetBtn {
	resetFiltersAction: Function,
	enabled: boolean
}

const ResetBtn = ({ resetFiltersAction, enabled }: ResetBtn) => {
	const onClick = () => enabled ? resetFiltersAction() : {};
	const baseStyle = {margin: '7px', fontSize: 14};
	const style = enabled
		? {...baseStyle, cursor: 'pointer'}
		: {...baseStyle, opacity: 0.5};
	const title = enabled ? "Reset all filters" : "No active filters";

	return (
		<div className="d-flex justify-content-end">
			<span className="fa-stack fa-1x" onClick={onClick} title={title} style={style}>
		 		<i className="fas fa-filter fa-stack-1x" />
	 			<i className="fas fa-ban fa-stack-2x" />
			</span>
		</div>
	);
};

function stateToProps(state: State){
	return {
		filterTemporal: state.filterTemporal,
		filterNumbers: state.filterNumbers,
		specTable: state.specTable,
		helpStorage: state.helpStorage,
		labelLookup: state.labelLookup,
		countryCodesLookup: state.countryCodesLookup,
		scopedKeywords: state.scopedKeywords,
		filterKeywords: state.filterKeywords,
		filterPids: state.filterPids,
		spatialRects: state.mapProps.rects
	};
}

function dispatchToProps(dispatch: PortalDispatch){
	return {
		updateFilter: (varName: ColNames | 'keywordFilter', values: Value[]) => dispatch(specFilterUpdate(varName, values)),
		setFilterTemporal: (filterTemporal: FilterTemporal) => dispatch(setFilterTemporal(filterTemporal)),
		setNumberFilter: (numberFilter: FilterNumber) => dispatch(setNumberFilter(numberFilter)),
		setKeywordFilter: (filterKeywords: string[]) => dispatch(setKeywordFilter(filterKeywords)),
	};
}

export default connect(stateToProps, dispatchToProps)(Filters);
