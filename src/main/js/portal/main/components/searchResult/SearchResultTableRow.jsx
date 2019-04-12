import React, { Component } from 'react';
import CheckBtn from '../buttons/ChechBtn.jsx';


const iconPin = '//static.icos-cp.eu/images/icons/pin.svg';
const iconCalendar = '//static.icos-cp.eu/images/icons/calendar.svg';
const iconInfo = '//static.icos-cp.eu/images/icons/info-circle-solid.svg';
const iconArrows = '//static.icos-cp.eu/images/icons/arrows-alt-v-solid.svg';

export default class SimpleObjectTableRow extends Component{
	constructor(props){
		super(props);
	}

	handleViewMetadata(){
		if (this.props.viewMetadata) this.props.viewMetadata(this.props.objInfo.dobj);
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
		const samplingHeight = extendedInfo && extendedInfo.samplingHeight ? extendedInfo.samplingHeight + ' meters' : undefined;
		const checkboxDisabled = objInfo.level === 0;
		const checkBtnTitle = checkboxDisabled
			? 'You cannot download or preview level 0 data through this portal'
			: `Click to select this data object for preview or add to cart`;

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
						<a title="View metadata" onClick={this.handleViewMetadata.bind(this)} style={{cursor: 'pointer'}}>{title}</a>
					</h4>
					{extendedInfo && extendedInfo.description &&
						<div>{extendedInfo.description}</div>
					}
					{extendedInfo &&
					<div className="extended-info" style={{marginTop: 4}}>
						<ExtendedInfoItem item={extendedInfo.theme} icon={extendedInfo.themeIcon} iconHeight={14} iconRightMargin={4} />
						{extendedInfo.station &&
						<ExtendedInfoItem item={extendedInfo.station.trim()} icon={iconPin} />
						}
						<ExtendedInfoItem item={`From ${formatDate(objInfo.timeStart)} to ${formatDate(objInfo.timeEnd)}`} icon={iconCalendar} />
						<ExtendedInfoItem item={objInfo.fileName} icon={'//static.icos-cp.eu/images/icons/file.svg'} />
						<ExtendedInfoItemLink item={'Landing page'} url={objInfo.dobj} iconHeight={14} icon={iconInfo} />
						<ExtendedInfoItem item={samplingHeight} icon={iconArrows} iconHeight={15} title="Sampling height" />
					</div>
					}
				</td>
			</tr>
		);
	}
}

const ExtendedInfoItem = ({item, icon, iconHeight = 18, iconRightMargin = 0, title, children}) => {
	const imgStyle = {height: iconHeight, marginTop: -2, marginRight: iconRightMargin};

	return (item && icon
		? <span className="extended-info-item" >
			<img src={icon} title={title} style={imgStyle}/> {children ? children : item}
		</span>
		: null
	);
};

const ExtendedInfoItemLink = ({item, icon, iconHeight = 18, iconRightMargin = 0, title, url}) => {
	return (item && icon && url
		? <ExtendedInfoItem item={item} icon={icon} iconHeight={iconHeight} iconRightMargin={iconRightMargin} title={title}>
			<a href={url}>{item}</a>
		</ExtendedInfoItem>
		: null
	);
};

function formatDate(d){
	if(!d || isNaN(d)) return '';

	return d.toISOString().substr(0, 10);
}
