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
}
type OurProps = StateProps & DispatchProps & incommingProps;

class Filters extends Component<OurProps> {
	render(){
		const {
			specTable, filterTemporal, helpStorage, labelLookup, updateFilter,
			setFilterTemporal, setNumberFilter, filterNumbers,
			scopedKeywords, filterKeywords, setKeywordFilter, countryCodesLookup
		} = this.props;

		return (
			<div>
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

function stateToProps(state: State){
	return {
		filterTemporal: state.filterTemporal,
		filterNumbers: state.filterNumbers,
		specTable: state.specTable,
		helpStorage: state.helpStorage,
		labelLookup: state.labelLookup,
		countryCodesLookup: state.countryCodesLookup,
		scopedKeywords: state.scopedKeywords,
		filterKeywords: state.filterKeywords
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
