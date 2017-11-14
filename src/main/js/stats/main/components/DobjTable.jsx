import React, { Component } from 'react';

export default class DobjTable extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {downloadStats, paging} = this.props;

    return (
      <div className="panel panel-default">
  			<div className="panel-heading">
          <h3 className="panel-title">Data objects {paging.offset} to {paging.to} of {paging.objCount}</h3>
  			</div>
  			<div className="panel-body">
          <table className="table">
            <tbody>
              <tr>
                <th>File Name</th>
                <th>Landing Page</th>
                <th>Count</th>
              </tr>
              { downloadStats.stats.length
              ? downloadStats.stats.map((stat, idx) => <Row key={'row-'+idx} dobj={stat}/>)
              : null
            }
            </tbody>
          </table>
        </div>
  		</div>
    )

  }
}

const Row = ({dobj}) => {
  return (
    <tr>
      <td>{dobj.fileName}</td>
      <td><a href={dobj._id} target="_blank">{dobj._id.split('/').pop()}</a></td>
      <td>{dobj.count}</td>
    </tr>
  )
}
