import React, { Component, CSSProperties } from 'react';
import CheckBtn from '../buttons/CheckBtn';
import { isSmallDevice, getLastSegmentInUrl, linesToShowStyle, getUrlWithEnvironmentPrefix } from '../../utils';
import {LinkifyText} from '../LinkifyText';
import config from '../../config';
import { KnownDataObject, ExtendedDobjInfo, LabelLookup } from "../../models/State";
import Preview from '../../models/Preview';
import CartItem, { addingToCartProhibition } from '../../models/CartItem';
import { UrlStr } from '../../backend/declarations';
import CollectionBtn from '../buttons/CollectionBtn';


const truncateStyle: CSSProperties = {
	maxWidth: '100%',
	overflow: 'hidden',
	textOverflow: 'ellipsis'
};

const iconStation = '//static.icos-cp.eu/images/icons/tower-observation.svg';
const iconArrows = '//static.icos-cp.eu/images/icons/arrows-up-down.svg';
const iconTime = '//static.icos-cp.eu/images/icons/timer.svg';
const iconFile = '//static.icos-cp.eu/images/icons/file.svg';
const iconCalendar = '//static.icos-cp.eu/images/icons/calendar.svg';
const iconLevel = [
	'//static.icos-cp.eu/images/icons/circle-0.svg',
	'//static.icos-cp.eu/images/icons/circle-1.svg',
	'//static.icos-cp.eu/images/icons/circle-2.svg',
	'//static.icos-cp.eu/images/icons/circle-3.svg'
];

interface OurProps {
	objInfo: KnownDataObject | undefined
	extendedInfo: ExtendedDobjInfo
	preview: Preview
	updateCheckedObjects: (ids: string) => void
	isChecked: boolean
	checkedObjects?: KnownDataObject[]
	labelLookup: LabelLookup
	isCartView: Boolean
}

export default class SearchResultRegularRow extends Component<OurProps> {

	render(){
		const props = this.props;
		const objInfo = props.objInfo;
		if (objInfo === undefined) {
			return;
		}
		const extendedInfo = props.extendedInfo.theme && props.extendedInfo.themeIcon
				? props.extendedInfo
				: { ...props.extendedInfo, theme: 'Other data', themeIcon: 'https://static.icos-cp.eu/images/themes/oth.svg' }
		const title = extendedInfo.title ?? extendedInfo.biblioInfo?.title ?? objInfo.fileName;
		const samplingHeight = extendedInfo.samplingHeight ? extendedInfo.samplingHeight + ' meters' : undefined;
		const {allowCartAdd, uiMessage} = addingToCartProhibition(objInfo);
		const checkBtnTitle = uiMessage ?? `Select to preview or download`;
		const level = `Level ${objInfo.level}`

		return(
			<div className='d-flex border-bottom py-3'>
				<div className='pe-3'>
					<label style={{margin:-5, padding:5}}>
						<CheckBtn
							onClick={() => props.updateCheckedObjects(objInfo.dobj)}
							title={checkBtnTitle}
							isChecked={props.isChecked}
							checkboxDisabled={props.isCartView ? false : !allowCartAdd}
							/>
					</label>
				</div>
				<div>
					<h4 className="fs-5">
						<a title="View metadata" href={getUrlWithEnvironmentPrefix(objInfo.dobj)}>{title}</a>
					</h4>
					<Description extendedInfo={extendedInfo} truncateStyle={truncateStyle} />
					<div className="extended-info" style={{ marginTop: 4 }}>
						<ExtendedInfoItem item={extendedInfo.theme} icon={extendedInfo.themeIcon} iconHeight={14} iconRightMargin={4} title="Theme"/>
						<ExtendedInfoItem item={level} icon={iconLevel[objInfo.level]} iconHeight={14} title="Data level" />
						<CollectionLinks dois={extendedInfo.dois} />
						{config.features.displayStationInExtendedInfo && extendedInfo.station &&
						<ExtendedInfoItem item={extendedInfo.station.trim()} icon={iconStation} iconHeight={13} title="Station"/>
						}
						{config.features.displayFileNameInExtendedInfo && objInfo.fileName &&
						<ExtendedInfoItem item={objInfo.fileName} icon={iconFile} iconHeight={13} title="File name" />
						}
						<ExtendedInfoItem item={samplingHeight} icon={iconArrows} iconHeight={14} title="Sampling height" />
						<ExtendedInfoItem item={objInfo.temporalResolution} icon={iconTime} iconHeight={13} title="Time resolution" />
						{extendedInfo.biblioInfo &&
						<ExtendedInfoItem item={extendedInfo.biblioInfo.temporalCoverageDisplay} icon={iconCalendar} iconHeight={12} iconRightMargin={2} title="Temporal coverage" />
						}
					</div>
				</div>
			</div>
		)
	}
}

export const getMetadataHash = (dobj: string) => {
	const hashObj = {
		route: 'metadata',
		id: getLastSegmentInUrl(dobj)
	};

	return "#" + encodeURIComponent(JSON.stringify(hashObj));
};

const Description: React.FunctionComponent<{
	extendedInfo: Partial<ExtendedDobjInfo> | undefined,
	truncateStyle: CSSProperties
}> = ({ extendedInfo, truncateStyle}) => {
	if(!extendedInfo) return null
	if (!extendedInfo.description && !extendedInfo.specComments) return null

	const ownDescription = extendedInfo.description ?? ""
	const separator = ownDescription && extendedInfo.specComments ? ". " : ""
	const description = (extendedInfo.specComments ?? "") + separator + ownDescription

	return isSmallDevice()
		? <div style={truncateStyle} title={description}>{description}</div>
		: <LinkifyText text={description} style={linesToShowStyle(5)} />;
};
interface ExtendedInfoItemProps {
	item?: string,
	icon?: string,
	iconHeight?: number,
	iconRightMargin?: number,
	title?: string
}
const ExtendedInfoItem: React.FunctionComponent<ExtendedInfoItemProps> = ({ item, icon, iconHeight = 18, iconRightMargin = 0, title = "" }) => {
	const imgStyle = {height: iconHeight, marginRight: iconRightMargin};

	return (item && icon
		? <span className="extended-info-item" title={title}>
			<img src={icon} style={imgStyle}/> <span style={{verticalAlign: 'middle', overflowWrap: 'anywhere', whiteSpace: 'normal'}}>{item}</span>
		</span>
		: null
	);
};

const CollectionLinks: React.FunctionComponent<{ dois?: UrlStr[] }> = ({ dois }) => {
	if (dois === undefined) return null;

	return (
		<>
			{dois.map((doi, i) =>
				<span key={i} className="extended-info-item">
					<CollectionBtn />
					<a href={config.doiBaseUrl + doi} style={{ marginLeft: 7 }} target="_blank">{doi}</a>
				</span>
			)}
		</>
	);
};
