import React, { Component } from 'react';

export default class DobjTable extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {downloadStats, paging, requestPage} = this.props;
    const start = (paging.offset - 1) * paging.pagesize;
    const end = start + paging.to;

    return (
      <div className="panel panel-default">
  			<div className="panel-heading">
    			<div style={{float: 'right'}}>
    				<StepButton direction="backward" enabled={start > 0} onStep={() => requestPage(paging.offset-1)} />
    				<StepButton direction="forward" enabled={end < paging.objCount} onStep={() => requestPage(paging.offset+1)} />
    			</div>
          <h3 className="panel-title">Data objects {start + 1} to {end} of {paging.objCount}</h3>
  			</div>
  			<div className="panel-body table-responsive" style={{clear: 'both'}}>
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
      <td><a href={`https://meta.icos-cp.eu/objects/${dobj._id}`} target="_blank">{dobj._id.slice(0, 24)}</a></td>
      <td>{dobj.count}</td>
    </tr>
  )
}

const StepButton = props => {
  const disabled = !props.enabled;
  return <button className="btn btn-default"
    style={Object.assign({display: 'inline', cursor: 'pointer', fontSize: '150%', position: 'relative', top: -4, borderWidth: 0, padding: 0, paddingLeft: 4, backgroundColor: 'transparent'})}
		onClick={props.onStep}
    disabled={disabled}
		>
		<span className={'glyphicon glyphicon-step-' + props.direction}></span>
	</button>;
};
