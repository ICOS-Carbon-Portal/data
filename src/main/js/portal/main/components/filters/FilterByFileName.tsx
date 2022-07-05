import React, {ChangeEvent, Component} from "react";
import {debounce} from 'icos-cp-utils';
import { HelpItemName } from "../../models/HelpStorage";
import HelpButton from "../../containers/help/HelpButton";

interface OurProps {
	updateFileName: (name: string) => void
	helpItemName?: HelpItemName
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
		const helpItemName = this.props.helpItemName;

		return (
			<div className="row" style={{marginTop: 10}}>
				<div className="col-md-12">
					<label style={{marginBottom: 0}}>Filename (exact match only)</label>
					{helpItemName &&
						<HelpButton
							name={helpItemName}
							title="Click to toggle help"
						/>
					}

					<input
						type="text"
						placeholder="Paste in file name"
						className="form-control"
						onChange={this.makeQueryDebounced}
					/>

				</div>
			</div>
		);
	}
}
