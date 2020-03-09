import React from 'react';
import config, {CategoryType, placeholders} from "../../config";
import CompositeSpecTable, {ColNames} from "../../models/CompositeSpecTable";
import {IdxSig} from "../../backend/declarations";
import {isDefined} from "../../utils";
import {Value} from "../../models/SpecTable";
import HelpButton from "../../containers/help/HelpButton";
import MultiSelectFilter from "./MultiSelectFilter";

interface OurProps {
	name: CategoryType
	specTable: CompositeSpecTable
	labelLookup: IdxSig
	updateFilter: (varName: ColNames, values: Value[]) => void
}

const helpButtonsToShow = ['project', 'station', 'submitter', 'type', 'level', 'format', 'quantityKind', 'valType'];
const search: {[C in CategoryType]?: any} = {}; //values are set by MultiSelectFilter

export const MultiselectCtrl: React.FunctionComponent<OurProps> = props => {
	const {name, specTable, labelLookup, updateFilter} = props;
	type StrNum = string | number

	const filterUris = specTable.getFilter(name) ?? [];
	const data = specTable
		? specTable.getDistinctAvailableColValues(name)
			.filter(isDefined)
			.map(value => ({value, text: labelLookup[value] ?? value})) as {value: StrNum, text: StrNum}[]
		: [];
	const value: Value[] = filterUris
		.map((val: Value) => data.some(d => d.value === val)
			? val
			: labelLookup[val!] ?? val)
		.filter(isDefined);

	if (data[0]) {
		typeof data[0].text === "string"
			? data.sort((d1: any, d2: any) => d1.text.localeCompare(d2.text))
			: data.sort((d1: any, d2: any) => d1.text - d2.text);
	}

	const placeholder = data.length === 1
		? `${data[0].text}`
		: `(${data.length} items)`;

	return (
		<div className="row" key={name} style={{marginTop: 10}}>
			<div className="col-md-12">
				<label style={{marginBottom: 0}}>{placeholders[config.envri][name]}</label>

				{helpButtonsToShow.includes(name) &&
				<HelpButton
					name={name}
					title="Click to toggle help"
				/>}

				<MultiSelectFilter
					name={name}
					search={search}
					updateFilter={updateFilter}
					placeholder={placeholder}
					data={data}
					value={value}
				/>
			</div>
		</div>
	);
};
