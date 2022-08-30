import React, {ChangeEvent, Component} from "react";
import {debounce} from 'icos-cp-utils';
import HelpButton from "../../containers/help/HelpButton";

interface OurProps {
	filterFileName: string
	updateFileName: (name: string) => void
	showDeprecated: Boolean
}

export default class FilterByFileName extends Component<OurProps> {
	private readonly makeQueryDebounced: (ev: ChangeEvent<HTMLInputElement>) => void;

	constructor(props: OurProps) {
		super(props);

		this.makeQueryDebounced = debounce(this.makeQuery.bind(this));
	}

	private makeQuery(ev: ChangeEvent<HTMLInputElement>){
		const fileName = ev.target.value;

		this.props.updateFileName(fileName);
	}

	render() {
		return (
			<div className="row" style={{marginTop: 10}}>
				<div className="col-md-12">
					<label style={{marginBottom: 0}}>Filename (exact match only)</label>
					<HelpButton name="fileNameFilter" />

					<input
						type="text"
						placeholder="Paste a file name"
						className="form-control"
						onChange={this.makeQueryDebounced}
						defaultValue={this.props.filterFileName}
					/>

				</div>
			</div>
		);
	}
}
