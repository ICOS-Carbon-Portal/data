import React from 'react';
import config, {CategoryType, placeholders} from "../../config";
import {ColNames} from "../../models/CompositeSpecTable";
import {Value} from "../../models/SpecTable";
import HelpButton from "../../containers/help/HelpButton";
import MultiSelectFilter from "./MultiSelectFilter";
import { Dict } from '../../../../common/main/types';
import { LabelLookup } from '../../models/State';
import {HelpItem, HelpStorageListEntry} from "../../models/HelpStorage";
import FilterOperationBtn from "../buttons/FilterOperationBtn";

interface OurProps {
	name: CategoryType
	data: Item[]
	value: Item[]
	helpItem?: HelpItem
	updateFilter: (varName: ColNames | 'keywordFilter', values: Value[]) => void
}

const search: { [C in CategoryType]?: string } = {}; //values are set by MultiSelectFilter

export type Item = {
	value: Value
	text: string
	helpStorageListEntry: HelpStorageListEntry[]
	presentWithCurrentFilters?: boolean
}

export const MultiselectCtrl: React.FunctionComponent<OurProps> = props => {
	const {name, data, value, helpItem, updateFilter} = props;
	const shouldUseExternalListEntry = helpItem?.shouldUseExternalList ?? false;
	const isInverterEnabled = value.length > 0 && data.length > 0 && name !== "variable" && name !== "valType";

	const placeholder = data.length === 1
		? `${data[0].text}`
		: `(${data.length} items)`;

	return (
		<>
			<div className="row" style={{marginTop: 10}}>
				<div className="col d-flex justify-content-between">
					<div>
						<label>{placeholders[config.envri][name]}</label>

						<HelpButton name={name} />
					</div>

					<div>
						<FilterOperationBtn
							enabled={isInverterEnabled}
							filterName={name}
							title="Invert filter selection"
							baseStyle={{fontSize: 16}}
							iconCls="fas fa-retweet"
							action={() => updateFilter(name, data.map(item => item.value))}
						/>
						<FilterOperationBtn
							enabled={value.length > 0}
							filterName={name}
							title="Reset this filter"
							baseStyle={{fontSize: 16, marginLeft: 12}}
							iconCls="fas fa-times-circle"
							action={() => updateFilter(name, [])}
						/>
					</div>
				</div>
			</div>
			<div className="row">
				<div className="col-md-12">
					<MultiSelectFilter
						name={name}
						shouldUseExternalListEntry={shouldUseExternalListEntry}
						search={search}
						updateFilter={updateFilter}
						placeholder={placeholder}
						data={data}
						value={value}
					/>
				</div>
			</div>
		</>
	);
};
