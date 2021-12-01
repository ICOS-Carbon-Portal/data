import React, {ChangeEvent, Component} from "react";
import {debounce} from 'icos-cp-utils';
import { searchDobjByFileName } from "../../backend";
import { Sha256Str } from "../../backend/declarations";

interface OurProps {
	updateSelectedPids: (pidsArr: Sha256Str[]) => void
}

export default class FilterByFileName extends Component<OurProps> {
	private readonly makeQueryDebounced: (ev: ChangeEvent<HTMLInputElement>) => void;

	constructor(props: OurProps) {
		super(props);

		this.makeQueryDebounced = debounce(this.makeQuery.bind(this));
	}

	private makeQuery(ev: ChangeEvent<HTMLInputElement>){
		const fileName = ev.target.value;

		searchDobjByFileName(fileName).then(dobjs => {
			this.props.updateSelectedPids(dobjs.map(d => d.dobj));
		});
	}

	render() {

		return (
			<div className="row" style={{marginTop: 10}}>
				<div className="col-md-12">
					<label style={{marginBottom: 0}}>File name (exact)</label>

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
