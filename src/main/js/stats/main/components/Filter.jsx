import React, { Component } from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';

const placeholders = {
	specification: 'Specification',
	dataLevel: 'Data level',
	format: 'Format',
	stations: 'Stations',
	contributors: 'Contributors',
	themes: 'Theme',
	countryCodes: 'Country codes'
};

export default class Filter extends Component {
  constructor(props) {
    super(props);
		this.state = { value: [] }
  }

  render() {
    const {filters} = this.props;

		const Row = ({filter}) => {
			const downloadStats = this.props.downloadStats;
		  return (
		    <div className="row" key={filter.name} style={{marginTop: 10, display: 'flex', alignItems: 'center'}}>
					<div className="col-md-4">
						<label style={{marginBottom: 0}}>{placeholders[filter.name]}</label>
					</div>
					<div className="col-md-8">
						<Multiselect
								placeholder={placeholders[filter.name]}
								valueField="_id"
								textField="label"
								data={filter.values}
								value={this.props.downloadStats.getFilter(filter.name)}
								filter="contains"
								onChange={this.handleSelectionChange.bind(this, filter)}
							/>
					</div>
				</div>
		  )
		}

		const showResetBtn = !!filters;

    return (
      <div className="panel panel-default">
  			<div className="panel-heading">
					<h3 style={{display: 'inline'}} className="panel-title">Data object specification filter</h3>
					{showResetBtn
						? <ResetBtn resetFiltersAction={() => this.props.fetchDownloadStats({})} />
						: null
					}
  			</div>
  			<div className="panel-body">
  				{ filters
          ? filters.map((filter, idx) => <Row key={'row-'+idx} filter={filter} />)
          : null
          }
  			</div>
  		</div>
    )
  }

	handleSelectionChange(filter, values) {
		this.props.updateTableWithFilter(filter.name, values.map(value => value._id));
	}

	tagItem({item}) {
		return <span>{item.text}</span>;
	}

}

const ResetBtn = props => {
	return <div
		className="glyphicon glyphicon-ban-circle"
		style={{display: 'inline', float: 'right', fontSize: '160%', cursor: 'pointer'}}
		title="Clear all filters"
		onClick={props.resetFiltersAction}
		/>;
};
