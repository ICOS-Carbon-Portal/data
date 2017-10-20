import React, { Component } from 'react';

export default class DobjTable extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {downloadCounts} = this.props;

    return (
      <table className="table">
        <tbody>
          <tr>
            <th>File Name</th>
            <th>Landing Page</th>
            <th>Count</th>
          </tr>
          { downloadCounts
          ? downloadCounts.stats.map((stat, idx) => <Row key={'row-'+idx} dobj={stat}/>)
          : null
        }
        </tbody>
      </table>
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
