import React, { Component } from 'react';
import CheckBtn from '../buttons/ChechBtn.jsx';
import {isSmallDevice} from '../../utils';
import {LinkifyText} from '../LinkifyText';
import config from '../../config';


const truncateStyle = {
	maxWidth: '100%',
	whiteSpace: 'nowrap',
	overflow: 'hidden',
	textOverflow: 'ellipsis'
};

const iconStation = '//static.icos-cp.eu/images/icons/station.svg';
const iconArrows = '//static.icos-cp.eu/images/icons/arrows-alt-v-solid.svg';
const iconTime = '//static.icos-cp.eu/images/icons/time.svg'

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
		const location = extendedInfo && (extendedInfo.site ? extendedInfo.site : extendedInfo.station ? extendedInfo.station.trim() : undefined);
		const locationString = location ? ` from ${location}` : '';
		const dateString = `${formatDate(objInfo.timeStart)} \u2013 ${formatDate(objInfo.timeEnd)}`;
		const title = extendedInfo && extendedInfo.title ? extendedInfo.title : `${objInfo.specLabel}${locationString}, ${dateString}`;
		const samplingHeight = extendedInfo && extendedInfo.samplingHeight ? extendedInfo.samplingHeight + ' meters' : undefined;
		const checkboxDisabled = objInfo.level === 0;
		const checkBtnTitle = checkboxDisabled
			? 'You cannot download or preview level 0 data through this portal'
			: `Click to select this data object for preview or add to cart`;
		const metadataHash = getMetadataHash(objInfo.dobj);

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
						<a title="View metadata" href={metadataHash} onClick={this.handleViewMetadata.bind(this)} style={{cursor: 'pointer'}}>{title}</a>
					</h4>
					<Description extendedInfo={extendedInfo} truncateStyle={truncateStyle} />
					{extendedInfo &&
					<div className="extended-info" style={{marginTop: 4}}>
						<ExtendedInfoItem item={extendedInfo.theme} icon={extendedInfo.themeIcon} iconHeight={14} iconRightMargin={4} />
						{config.envri === "SITES" && extendedInfo.station &&
						<ExtendedInfoItem item={extendedInfo.station.trim()} icon={iconStation} iconHeight={16} />
						}
						<ExtendedInfoItem item={samplingHeight} icon={iconArrows} iconHeight={15} title="Sampling height" />
						<ExtendedInfoItem item={objInfo.temporalResolution} icon={iconTime} iconHeight={16} title="Time resolution" />
					</div>
					}
				</td>
			</tr>
		);
	}
}

const getMetadataHash = (dobj) => {
	const hashObj = {
		route: 'metadata',
		id: dobj.split('/').pop()
	};

	return "#" + encodeURIComponent(JSON.stringify(hashObj));
};

const Description = ({extendedInfo, truncateStyle}) => {
	if (!(extendedInfo && extendedInfo.description)) return null;

	return isSmallDevice()
		? <div style={truncateStyle} title={extendedInfo.description}>{extendedInfo.description}</div>
		: <LinkifyText text={extendedInfo.description} />;
};

const ExtendedInfoItem = ({item, icon, iconHeight = 18, iconRightMargin = 0, title}) => {
	const imgStyle = {height: iconHeight, marginRight: iconRightMargin};

	return (item && icon
		? <span className="extended-info-item" >
			<img src={icon} title={title} style={imgStyle}/> <span style={{verticalAlign: 'middle'}}>{item}</span>
		</span>
		: null
	);
};

function formatDate(d){
	if(!d || isNaN(d)) return '';

	return d.toISOString().substr(0, 10);
}
