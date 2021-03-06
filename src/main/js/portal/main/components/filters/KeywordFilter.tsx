import React from "react";
import keywordsInfo, {KeywordsInfo} from "../../backend/keywordsInfo";
import MultiSelectFilter from "./MultiSelectFilter";


interface OurProps {
	keywords: KeywordsInfo
	filterKeywords: string[]
	setKeywordFilter: (filterKeywords: string[]) => void
}

export const KeywordFilter: React.FunctionComponent<OurProps> = props => {
	const {keywords, filterKeywords, setKeywordFilter} = props;

	const data = keywordsInfo.allKeywords(keywords);
	const placeholder = data.length === 1
		? `${data[0]}`
		: `(${data.length} items)`;

	return (
		<div className="row" style={{marginTop: 10}}>
			<div className="col-md-12">
				<label style={{marginBottom: 0}}>Keyword</label>

				<MultiSelectFilter
					name={"keywordFilter"}
					search={{}}
					updateFilter={(_: any, keywords: string[]) => setKeywordFilter(keywords)}
					placeholder={placeholder}
					data={data}
					value={filterKeywords}
				/>
			</div>
		</div>
	);
};