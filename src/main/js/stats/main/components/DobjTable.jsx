import React, { Component } from 'react';
import './styles.css';

export default class DobjTable extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {dataList, paging, requestPage} = this.props;
    const start = (paging.offset - 1) * paging.pagesize;
    const end = start + paging.to;

    if (dataList && dataList.length) console.log({dataList});

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
              </tr>{
            	dataList && dataList.length
				  ? dataList.map((stat, idx) => <RowSwitch key={'row-' + idx} dobj={stat} />)
				  : null
				}
            </tbody>
          </table>
        </div>
  		</div>
    )

  }
}

const RowSwitch = ({dobj}) => {
	if (dobj.x && dobj.y){
		return <RowPreviewTS dobj={dobj} />;
	} else {
		return <RowDownloads dobj={dobj} />;
	}
};

const RowDownloads = ({dobj}) => {
  return (
    <tr>
      <td>{dobj.fileName}</td>
      <td><a href={`https://meta.icos-cp.eu/objects/${dobj._id}`} target="_blank">{dobj._id.slice(0, 24)}</a></td>
      <td>{dobj.count}</td>
    </tr>
  )
};

const RowPreviewTS = ({dobj}) => {
	return (
		<tr>
			<td>
				{dobj.fileName}
				<details>
					<summary>Additional info</summary>
					<div><u>Variables on X:</u> {dobj.x}</div>
					<div><u>Variables on Y:</u> {dobj.y}</div>
				</details>
			</td>
			<td><a href={`https://meta.icos-cp.eu/objects/${dobj._id}`} target="_blank">{dobj._id.slice(0, 24)}</a></td>
			<td>{dobj.count}</td>
		</tr>
	);
};

const Details = ({label, name, count}) => {
	return (
		<div>
			<label>{label}</label>
			<div>Name: {name}</div>
			<div>Count: {count}</div>
		</div>
	);
};

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
