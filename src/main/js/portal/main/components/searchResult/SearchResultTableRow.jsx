import React, { Component } from 'react';


const truncateStyle = {
	maxWidth: '100%',
	whiteSpace: 'nowrap',
	overflow: 'hidden',
	textOverflow: 'ellipsis'
};

export default class SimpleObjectTableRow extends Component{
	constructor(props){
		super(props);
		this.handleCheckboxChange = this.handleCheckboxChange.bind(this);
	}

	handleCheckboxChange() {
		this.props.onCheckboxChange();
	}

	render(){
		const props = this.props;
		const objInfo = props.objInfo;
		const extendedInfo = props.extendedInfo
			? props.extendedInfo.theme && props.extendedInfo.themeIcon
				? props.extendedInfo
				: {theme: 'Other data', themeIcon: 'https://static.icos-cp.eu/images/themes/oth.svg'}
			: props.extendedInfo;
		const title = extendedInfo && extendedInfo.title ? extendedInfo.title : objInfo.specLabel;
		const checkboxDisabled = objInfo.level === 0 ? "disabled" : "";

		return(
			<tr style={{margin: '20px 0'}}>
				<td style={{textAlign: 'center', width: 40, padding: '16px 8px'}}>
					<input className="data-checkbox" type="checkbox" name="data-checkbox" value={objInfo.dobj} onChange={this.handleCheckboxChange} disabled={checkboxDisabled} checked={props.isChecked}/>
				</td>
				<td style={{maxWidth: 0, padding: '16px 8px'}}>
					<h4 style={{marginTop: 0}}>
						<a href={objInfo.dobj} title="View metadata" target="_blank">{title}</a>
					</h4>
					{extendedInfo && extendedInfo.description &&
						<div style={truncateStyle} title={extendedInfo.description}>{extendedInfo.description}</div>
					}
					{extendedInfo &&
					<div className="extended-info" style={{marginTop: 4}}>
						<ExtendedInfoItem item={extendedInfo.theme} icon={extendedInfo.themeIcon} width={'80px'} iconHeight={14} iconRightMargin={4} />
						{extendedInfo.station &&
						<ExtendedInfoItem item={extendedInfo.station.trim()} icon={'//static.icos-cp.eu/images/icons/pin.svg'} width={'120px'} />
						}
						<ExtendedInfoItem item={`From ${formatDate(objInfo.timeStart)} to ${formatDate(objInfo.timeEnd)}`} icon={'//static.icos-cp.eu/images/icons/calendar.svg'} width={'240px'} />
						<ExtendedInfoItem item={objInfo.fileName} icon={'//static.icos-cp.eu/images/icons/file.svg'} width={'220px'} />
					</div>
					}
				</td>
			</tr>
		);
	}
}

const ExtendedInfoItem = ({item, icon, width, iconHeight = 18, iconRightMargin = 0}) => {
	if (item && icon) {
		return <span className="extended-info-item" style={{display: 'inline-block', marginRight: 16, minWidth: width}}>
			<img src={icon} style={{height: iconHeight, marginTop: -2, marginRight: iconRightMargin}}/> {item}
		</span>;
	}
};

function formatDate(d){
	if(!d) return '';

	return d.toISOString().substr(0, 10);
}
