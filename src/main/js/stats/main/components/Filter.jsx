import React, { Component } from 'react';
import Multiselect from 'react-widgets/lib/Multiselect';

const placeholders = {
	specification: 'Specification',
	dataLevel: 'Data level',
	format: 'Format'
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

    return (
      <div className="panel panel-default">
  			<div className="panel-heading">
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
