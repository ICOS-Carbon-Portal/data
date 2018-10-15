import React, { Component } from 'react';
import CheckBtn from '../buttons/ChechBtn.jsx';


const truncateStyle = {
	maxWidth: '100%',
	whiteSpace: 'nowrap',
	overflow: 'hidden',
	textOverflow: 'ellipsis'
};

export default class SimpleObjectTableRow extends Component{
	constructor(props){
		super(props);
	}

	render(){
		const props = this.props;
		const objInfo = props.objInfo;
		const lookup = props.lookup;
		const checkedObjects = props.checkedObjects;
		const extendedInfo = props.extendedInfo
			? props.extendedInfo.theme && props.extendedInfo.themeIcon
				? props.extendedInfo
				: {theme: 'Other data', themeIcon: 'https://static.icos-cp.eu/images/themes/oth.svg'}
			: props.extendedInfo;
		const title = extendedInfo && extendedInfo.title ? extendedInfo.title : objInfo.specLabel;
		const checkboxDisabled = objInfo.level === 0;
		const checkBtnTitle = checkboxDisabled
			? 'You cannot download or preview level 0 data through this portal'
			: `Click to select this data object for preview or add to cart`;
		// console.log({checkedObjects, lookup, lookupType: lookup.getSpecLookupType(objInfo.spec), objInfo, isChecked: props.isChecked, checkboxDisabled: objInfo.level === 0 ? "disabled" : "", title});

		return(
			<tr style={{margin: '20px 0'}}>
				<td style={{textAlign: 'center', width: 30, padding: '16px 0px'}}>
					<CheckBtn
						updateCheckedObjects={props.updateCheckedObjects}
						id={objInfo.dobj}
						title={checkBtnTitle}
						isChecked={props.isChecked}
						checkboxDisabled={checkboxDisabled ? "disabled" : ""}
					/>
				</td>
				<td style={{maxWidth: 0, padding: '16px 8px'}}>
					<h4 style={{marginTop: 0}}>
						<a href={objInfo.dobj} title="View metadata">{title}</a>
					</h4>
					{extendedInfo && extendedInfo.description &&
						<div style={truncateStyle} title={extendedInfo.description}>{extendedInfo.description}</div>
					}
					{extendedInfo &&
					<div className="extended-info" style={{marginTop: 4}}>
						<ExtendedInfoItem item={extendedInfo.theme} icon={extendedInfo.themeIcon} iconHeight={14} iconRightMargin={4} />
						{extendedInfo.station &&
						<ExtendedInfoItem item={extendedInfo.station.trim()} icon={'//static.icos-cp.eu/images/icons/pin.svg'} />
						}
						<ExtendedInfoItem item={`From ${formatDate(objInfo.timeStart)} to ${formatDate(objInfo.timeEnd)}`} icon={'//static.icos-cp.eu/images/icons/calendar.svg'} />
						<ExtendedInfoItem item={objInfo.fileName} icon={'//static.icos-cp.eu/images/icons/file.svg'} />
					</div>
					}
				</td>
			</tr>
		);
	}
}

const ExtendedInfoItem = ({item, icon, iconHeight = 18, iconRightMargin = 0}) => {
	if (item && icon) {
		return <span className="extended-info-item" >
			<img src={icon} style={{height: iconHeight, marginTop: -2, marginRight: iconRightMargin}}/> {item}
		</span>;
	}
};

function formatDate(d){
	if(!d || isNaN(d)) return '';

	return d.toISOString().substr(0, 10);
}
