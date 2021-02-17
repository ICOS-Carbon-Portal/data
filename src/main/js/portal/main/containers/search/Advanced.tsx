import React, {Component, CSSProperties, Fragment, MouseEvent} from 'react';
import { connect } from 'react-redux';
import {State} from "../../models/State";
import {PortalDispatch} from "../../store";
import {makeQuerySubmittable, updateSearchOption, updateSelectedPids} from "../../actions/search";
import {Sha256Str} from "../../backend/declarations";
import {SearchOption} from "../../actions/types";
import FilterByPid from "../../components/filters/FilterByPid";
import {Style} from "../../../../common/main/style";
import CheckBtn from "../../components/buttons/ChechBtn";
import {FilterPanel} from "../../components/filters/FilterPanel";
import { ToSparqlClient } from '../../components/ToSparqlClient';
import { publicQueries, QueryName } from '../../config';
import * as queries from '../../sparqlQueries';
import { getFilters } from '../../actions/common';
import { specKeywordsQuery } from '../../backend/keywordsInfo';

type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type OurProps = StateProps & DispatchProps & {tabHeader: string};

class Advanced extends Component<OurProps> {
	render(){
		const { searchOptions, updateSearchOption, filterPids, updateSelectedPids, getPublicQuery } = this.props;
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

				<FilterPanel header="SPARQL queries" helpItemName="publicQuery">
					<QueryList getPublicQuery={getPublicQuery} />
				</FilterPanel>
			</Fragment>
		);
	}
}

const QueryList = ({ getPublicQuery }: { getPublicQuery: (queryName: QueryName) => string }) => {
	return (
		<ul style={{ marginTop: 10, listStyle: 'none', padding: 5 }}>
			{(Object.keys(publicQueries) as QueryName[]).map((queryName, idx) => {
				const { label, comment } = publicQueries[queryName];
				return (
					<li key={idx} style={{ marginTop: 7 }}>
						<span className="glyphicon glyphicon-share" style={{ marginRight: 5 }} />
						<ToSparqlClient queryName={queryName} getPublicQuery={getPublicQuery} label={label} comment={comment} />
					</li>
				);
			})}
		</ul>
	);
};

interface CheckButton {
	onClick: (event: MouseEvent<HTMLButtonElement>) => void
	isChecked: boolean
	text: string
	checkboxDisabled?: boolean
	styleBtn?: CSSProperties
	styleTxt?: CSSProperties
}

const CheckButton = (props: CheckButton) => {
	const {onClick, isChecked, text} = props;
	const checkboxDisabled = props.checkboxDisabled || false;
	const defaultStyleBtn = {margin:0, fontSize:12};
	const styleBtn: Style = props.styleBtn
		? Object.assign(defaultStyleBtn, props.styleBtn)
		: defaultStyleBtn;
	const defaultStyleTxt: CSSProperties = {marginLeft:5, top:1, position:'relative'};
	const styleTxt: CSSProperties = props.styleTxt
		? { ...defaultStyleTxt, ...props.styleTxt }
		: defaultStyleTxt;

	return (
		<div style={{marginTop:15}}>
			<CheckBtn onClick={onClick} isChecked={isChecked} style={styleBtn} checkboxDisabled={checkboxDisabled} />
			<span style={styleTxt}>{text}</span>
		</div>
	);
};

function getQueryBuilder(state: State): (queryName: QueryName) => string {
	type QueryThunk = () => {text: string}

	const lookup: {[key in QueryName]: QueryThunk} = {
		specBasics:                   queries.specBasics,
		specColumnMeta:               queries.specColumnMeta,
		dobjOriginsAndCounts:   () => queries.dobjOriginsAndCounts(getFilters(state)),
		extendedDataObjectInfo: () => queries.extendedDataObjectInfo(state.extendedDobjInfo.map(d => d.dobj)),
		labelLookup:                  queries.labelLookup,
		specKeywordsQuery:            specKeywordsQuery
	};

	return qName => makeQuerySubmittable(lookup[qName]().text);
};

function stateToProps(state: State) {
	return {
		filterPids: state.filterPids,
		searchOptions: state.searchOptions,
		getPublicQuery: getQueryBuilder(state)
	};
}

function dispatchToProps(dispatch: PortalDispatch){
	return {
		updateSelectedPids: (pids: Sha256Str[]) => dispatch(updateSelectedPids(pids)),
		updateSearchOption: (searchOption: SearchOption) => dispatch(updateSearchOption(searchOption))
	};
}

export default connect(stateToProps, dispatchToProps)(Advanced);
