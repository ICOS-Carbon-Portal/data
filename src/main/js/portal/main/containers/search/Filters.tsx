import React, {Component} from 'react';
import {connect} from 'react-redux';
import {Value} from "../../models/SpecTable";
import {State} from "../../models/State";
import {PortalDispatch} from "../../store";
import {ColNames} from "../../models/CompositeSpecTable";
import {
	filtersReset,
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
type OurProps = StateProps & DispatchProps & {tabHeader: string};

class Filters extends Component<OurProps> {
	render(){
		const {specTable, filtersReset, filterTemporal, labelLookup, updateFilter, setFilterTemporal,
			setNumberFilter, filterNumbers, keywords, filterKeywords, setKeywordFilter} = this.props;
		const resetBtnEnabled = filterTemporal.hasFilter || specTable.hasActiveFilters || filterNumbers.hasFilters;

		return (
			<div>
				<ResetBtn enabled={resetBtnEnabled} resetFiltersAction={filtersReset} />

				<PanelsWithFilters
					filterNumbers={filterNumbers}
					specTable={specTable}
					labelLookup={labelLookup}
					updateFilter={updateFilter}
					setNumberFilter={setNumberFilter}
					filterTemporal={filterTemporal}
					setFilterTemporal={setFilterTemporal}
					keywords={keywords}
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
	const className = enabled ? 'btn btn-link' : 'btn btn-link disabled';
	const style = enabled
		? {margin: '5px 2px', textDecoration: 'underline', cursor: 'pointer'}
		: {margin: '5px 2px', textDecoration: 'underline'};
	const onClick = () => enabled ? resetFiltersAction() : {};

	return <div style={{textAlign: 'right'}}><button className={className} style={style} onClick={onClick}>Clear filters</button></div>;
};

function stateToProps(state: State){
	return {
		filterTemporal: state.filterTemporal,
		filterNumbers: state.filterNumbers,
		specTable: state.specTable,
		labelLookup: state.labelLookup,
		keywords: state.keywords,
		filterKeywords: state.filterKeywords,
	};
}

function dispatchToProps(dispatch: PortalDispatch){
	return {
		updateFilter: (varName: ColNames, values: Value[]) => dispatch(specFilterUpdate(varName, values)),
		filtersReset: () => dispatch(filtersReset),
		setFilterTemporal: (filterTemporal: FilterTemporal) => dispatch(setFilterTemporal(filterTemporal)),
		setNumberFilter: (numberFilter: FilterNumber) => dispatch(setNumberFilter(numberFilter)),
		setKeywordFilter: (filterKeywords: string[]) => dispatch(setKeywordFilter(filterKeywords)),
	};
}

export default connect(stateToProps, dispatchToProps)(Filters);
