import React from 'react';
import {connect} from 'react-redux';
import {AdvancedFilter, State} from "../../models/State";
import {PortalDispatch} from "../../store";
import {ColNames} from "../../models/CompositeSpecTable";
import {Value} from "../../models/SpecTable";
import config, {CategoryType, numericFilterLabels, placeholders} from "../../config";
import FilterTemporal from "../../models/FilterTemporal";
import {FilterNumber} from "../../models/FilterNumbers";
import {
	specFilterUpdate,
	setFilterTemporal,
	setNumberFilter,
	setKeywordFilter,
	updateAdvanced
} from "../../actions/search";
import {isInPidFilteringMode} from "../../reducers/utils";
import {getCategoryValueText} from "../../components/filters/PanelsWithFilters";
import {isDefined} from "../../utils";

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type IncomingProps = {
	removeMapRect: () => void
	clearAllFilters: () => void
}

type OurProps = StateProps & DispatchProps & IncomingProps;

const advancedFilterTypeLabels: {[key in AdvancedFilter]: string} = {
	dobj: 'Data object PID',
	collection: 'Collection PID',
	filename: 'File name'
};

const collapseThreshold = 4;

type TagValue = {
	key: string
	text: string
	onRemove: () => void
}

type TagGroup = {
	key: string
	label: string
	values: TagValue[]
	onRemoveAll?: () => void
}

function ActiveFilters(props: OurProps) {
	const {
		specTable, filterTemporal, filterNumbers, filterKeywords, filterAdvancedText, filterAdvancedType,
		filterPids, tabs, spatialRects, labelLookup, countryCodesLookup,
		updateFilter, setFilterTemporal, setNumberFilter, setKeywordFilter, updateAdvanced, removeMapRect, clearAllFilters
	} = props;

	const groups: TagGroup[] = [];

	if (isInPidFilteringMode(tabs, filterPids)) {
		groups.push({
			key: 'advanced',
			label: advancedFilterTypeLabels[filterAdvancedType],
			values: [{
				key: 'advanced',
				text: filterAdvancedText,
				onRemove: () => updateAdvanced('', filterAdvancedType)
			}]
		});
	} else {
		const activeCategoryColumns = specTable.names.filter(colName => specTable.getFilter(colName) !== null);

		activeCategoryColumns.forEach(colName => {
			const filterValues = (specTable.getFilter(colName) ?? []).filter(isDefined);
			const categoryName = colName as unknown as CategoryType;

			groups.push({
				key: `category:${colName}`,
				label: placeholders[config.envri][categoryName],
				values: filterValues.map(value => ({
					key: `${colName}:${value}`,
					text: getCategoryValueText(categoryName, value, countryCodesLookup, labelLookup) ?? String(value),
					onRemove: () => updateFilter(colName, filterValues.filter(v => v !== value))
				})),
				onRemoveAll: () => updateFilter(colName, [])
			});
		});

		if (filterKeywords.length > 0) {
			groups.push({
				key: 'keywords',
				label: 'Keyword',
				values: filterKeywords.map(keyword => ({
					key: `keyword:${keyword}`,
					text: keyword,
					onRemove: () => setKeywordFilter(filterKeywords.filter(k => k !== keyword))
				})),
				onRemoveAll: () => setKeywordFilter([])
			});
		}

		filterNumbers.validFilters.forEach(filterNumber => {
			groups.push({
				key: `number:${filterNumber.category}`,
				label: numericFilterLabels[filterNumber.category],
				values: [{
					key: `number:${filterNumber.category}`,
					text: filterNumber.txt,
					onRemove: () => setNumberFilter(filterNumber.validate(''))
				}]
			});
		});

		const {dataTime, submission} = filterTemporal;

		const dataTimeValues: TagValue[] = [];
		if (dataTime.from) {
			dataTimeValues.push({
				key: 'dataTime:from',
				text: `From ${dataTime.fromDateStr}`,
				onRemove: () => setFilterTemporal(filterTemporal.withDataTimeFrom(undefined))
			});
		}
		if (dataTime.to) {
			dataTimeValues.push({
				key: 'dataTime:to',
				text: `To ${dataTime.toDateStr}`,
				onRemove: () => setFilterTemporal(filterTemporal.withDataTimeTo(undefined))
			});
		}
		if (dataTimeValues.length > 0) {
			groups.push({key: 'dataTime', label: 'Sampling date', values: dataTimeValues});
		}

		const submissionValues: TagValue[] = [];
		if (submission.from) {
			submissionValues.push({
				key: 'submission:from',
				text: `From ${submission.fromDateStr}`,
				onRemove: () => setFilterTemporal(filterTemporal.withSubmissionFrom(undefined))
			});
		}
		if (submission.to) {
			submissionValues.push({
				key: 'submission:to',
				text: `To ${submission.toDateStr}`,
				onRemove: () => setFilterTemporal(filterTemporal.withSubmissionTo(undefined))
			});
		}
		if (submissionValues.length > 0) {
			groups.push({key: 'submission', label: 'Submission date', values: submissionValues});
		}

		if (spatialRects && spatialRects.length > 0) {
			groups.push({
				key: 'map',
				label: 'Map filter',
				values: [{key: 'map', text: 'Active', onRemove: removeMapRect}]
			});
		}
	}

	if (groups.length === 0) {
		return null;
	}

	return (
		<div className="active-filters d-flex flex-wrap border-bottom">
			{groups.map(group => (
				<FilterTagGroup key={group.key} label={group.label} values={group.values} onRemoveAll={group.onRemoveAll} />
			))}
			<span className="active-filter-tag active-filter-tag-warning" onClick={clearAllFilters}>
				Clear all
				<i className="fas fa-trash" />
			</span>
		</div>
	);
}

type FilterTagGroupProps = {
	label: string
	values: TagValue[]
	onRemoveAll?: () => void
}

function FilterTagGroup({label, values, onRemoveAll}: FilterTagGroupProps) {
	const isCollapsed = onRemoveAll !== undefined && values.length >= collapseThreshold;

	return (
		<div className="active-filter-group">
			<span className="active-filter-category">{label}</span>
			{isCollapsed
				? <FilterTag label={`${values.length} items`} onRemove={onRemoveAll} />
				: values.map(value => <FilterTag key={value.key} label={value.text} onRemove={value.onRemove} />)
			}
		</div>
	);
}

type FilterTagProps = {
	label: string
	onRemove: () => void
}

function FilterTag({label, onRemove}: FilterTagProps) {
	return (
		<span className="active-filter-tag">
			{label}
			<i
				className="fas fa-times"
				title="Remove this filter"
				onClick={onRemove}
			/>
		</span>
	);
}

function stateToProps(state: State) {
	return {
		specTable: state.specTable,
		filterTemporal: state.filterTemporal,
		filterNumbers: state.filterNumbers,
		filterKeywords: state.filterKeywords,
		filterAdvancedText: state.filterAdvancedText,
		filterAdvancedType: state.filterAdvancedType,
		filterPids: state.filterPids,
		tabs: state.tabs,
		spatialRects: state.mapProps.rects,
		labelLookup: state.labelLookup,
		countryCodesLookup: state.countryCodesLookup
	};
}

function dispatchToProps(dispatch: PortalDispatch) {
	return {
		updateFilter: (varName: ColNames, values: Value[]) => dispatch(specFilterUpdate(varName, values)),
		setFilterTemporal: (filterTemporal: FilterTemporal) => dispatch(setFilterTemporal(filterTemporal)),
		setNumberFilter: (numberFilter: FilterNumber) => dispatch(setNumberFilter(numberFilter)),
		setKeywordFilter: (filterKeywords: string[]) => dispatch(setKeywordFilter(filterKeywords)),
		updateAdvanced: (filterText: string, filterType: AdvancedFilter) => dispatch(updateAdvanced(filterText, filterType))
	};
}

export default connect(stateToProps, dispatchToProps)(ActiveFilters);
