import React from "react";
import keywordsInfo, {KeywordsInfo} from "../../backend/keywordsInfo";
import { Value } from "../../models/SpecTable";
import { isDefined } from "../../utils";
import { Item } from "./MultiselectCtrl";
import MultiSelectFilter from "./MultiSelectFilter";


interface OurProps {
	keywords: KeywordsInfo
	filterKeywords: string[]
	setKeywordFilter: (filterKeywords: string[]) => void
}

export const KeywordFilter: React.FunctionComponent<OurProps> = props => {
	const {keywords, filterKeywords, setKeywordFilter} = props;

	const value: Item[] = filterKeywords.map(kw => ({text: kw, value: kw, helpStorageListEntry: []}));
	const data: Item[] = keywordsInfo.allKeywords(keywords)
		.map(txt => ({text: txt, value: txt, helpStorageListEntry: []}))
		.filter(item => !value.some(v => v.value == item.value));
	const placeholder = data.length === 1
		? `${data[0]}`
		: `(${data.length} items)`;

	return (
		<div className="row" style={{marginTop: 10}}>
			<div className="col-md-12">
				<label style={{marginBottom: 0}}>Keyword</label>

				<MultiSelectFilter
					name={"keywordFilter"}
					shouldUseExternalListEntry={false}
					search={{}}
					updateFilter={(_: any, keywords: Value[]) => setKeywordFilter(keywords.filter(isDefined).map(kw => kw + ''))}
					placeholder={placeholder}
					data={data}
					value={value}
				/>
			</div>
		</div>
	);
};