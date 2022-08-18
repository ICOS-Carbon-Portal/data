import React, { Component } from 'react';
import { Sha256Str } from '../../backend/declarations';
import { checkDobjExists } from '../../backend';
import { pidRegexp } from '../../utils';
import HelpButton from '../../containers/help/HelpButton';


interface PidFilterProps {
	//empty array for not found, null for no active filter
	filterPids: Sha256Str[] | null
	filterFileName: string
	updateSelectedPids: (pidsArr: Sha256Str[] | null) => void
	showDeprecated: Boolean
}

interface PidFilterState{
	message?: string
	validityClass: string
}

export default class FilterByPid extends Component<PidFilterProps, PidFilterState>{

	constructor(props: PidFilterProps){
		super(props)
		this.state = {message: undefined, validityClass: ''}
	}

	handleSearch(searchStr: string){
		if(!searchStr || searchStr == ''){
			this.props.updateSelectedPids(null)
			this.setState({message: undefined, validityClass: ''})
			return;
		}

		const pidMatch = searchStr.match(pidRegexp)
		if(pidMatch){
			const self = this
			this.setState({validityClass: ''})
			const pidStr = pidMatch[1]
			self.props.updateSelectedPids([pidStr])

			checkDobjExists(pidStr, this.props.showDeprecated).then(exists => {
				if(exists){
					self.setState({message: undefined, validityClass: ' is-valid'})
				} else {
					self.setState({message: 'PID not found', validityClass: ''})
				}
			})
		} else{
			this.setState({message: 'Not a valid data object PID', validityClass: ' is-invalid'})
		}

	}

	render(){
		let searchText = '';
		const {filterPids} = this.props;
		if(filterPids && filterPids.length == 1 && this.props.filterFileName == ''){
			searchText = filterPids[0]
		}
		return (
			<div className="row" style={{marginTop: 10}}>
				<div className="col-md-12">
					<label style={{marginBottom: 0}}>PID</label>
					<HelpButton name="pidFilter" />
					<input
						type="text"
						className={"form-control" + this.state.validityClass}
						title = {this.state.message}
						placeholder="object PID or PID suffix"
						onChange={e => this.handleSearch(e.target.value)}
						defaultValue={searchText}
					/>
				</div>
			</div>
		);
	}
}
