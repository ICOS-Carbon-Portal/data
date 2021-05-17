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

const search: { [C in CategoryType]?: any } = {}; //values are set by MultiSelectFilter

type StrNum = string | number
type Data = {
	value: StrNum
	text: StrNum
}

export const MultiselectCtrl: React.FunctionComponent<OurProps> = props => {
	const {name, specTable, labelLookup, updateFilter} = props;

	const filterUris = specTable.getFilter(name) ?? [];
	const data: Data[] = specTable
		? makeUniqueDataText(name === 'valType', specTable, specTable.getDistinctAvailableColValues(name)
			.filter(isDefined)
			.map(value => ({ value, text: labelLookup[value] ?? value }))
		)
		: [];
	
	const value: Value[] = filterUris
		.map((val: Value) => data.some(d => d.value === val)
			? val
			: labelLookup[val!] ?? val)
		.filter(isDefined);

	if (data.length) {
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

				<HelpButton
					name={name}
					title="Click to toggle help"
				/>

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

const makeUniqueDataText = (makeUnique: boolean, specTable: CompositeSpecTable, data: Data[]): Data[] => {
	if (!makeUnique) return data;

	const dataLookup = data.reduce<IdxSig<number, StrNum>>((acc, curr) => {
		acc[curr.text] = (acc[curr.text] ?? 0) + 1;
		return acc;
	}, {});

	return data.map(d => {
		return dataLookup[d.text] === 1
			? d
			: {
				value: d.value,
				text: `${d.text} [${specTable.columnMetaRows.find(r => r.valType === d.value)?.quantityUnit ?? 'unknown unit'}]`
			};
	});
};
