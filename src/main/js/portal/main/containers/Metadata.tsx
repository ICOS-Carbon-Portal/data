import React, { Component, ReactElement } from 'react';
import { connect } from 'react-redux';
import CartBtn from '../components/buttons/CartBtn.jsx';
import PreviewBtn from '../components/buttons/PreviewBtn.jsx';
import { formatDate, formatDateTime } from '../utils';
import commonConfig from '../../../common/main/config';
import {LinkifyText} from "../components/LinkifyText";
import {MetaDataObject, Route, State} from "../models/State";
import {PortalDispatch} from "../store";
import {updateFilteredDataObjects} from '../actions/metadata';
import {Sha256Str, UrlStr} from "../backend/declarations";
import {L2OrLessSpecificMeta, L3SpecificMeta} from "../../../common/main/metacore";
import config, {timezone} from '../config';
import AboutSection from '../components/metadata/AboutSection';
import AcquisitionSection from '../components/metadata/AcquisitionSection';
import ProductionSection from '../components/metadata/ProductionSection';
import ContentSection from '../components/metadata/ContentSection';
import {addToCart, removeFromCart, setMetadataItem, switchToPreview} from "../actions/common";


type StateProps = ReturnType<typeof stateToProps>;
type DispatchProps = ReturnType<typeof dispatchToProps>;
type MetadataProps = StateProps & DispatchProps;

class Metadata extends Component<MetadataProps> {
	constructor(props: MetadataProps) {
		super(props);
	}

	handleAddToCart(ids: UrlStr[]) {
		this.props.addToCart(ids);
	}

	handleRemoveFromCart(ids: UrlStr[]) {
		this.props.removeFromCart(ids);
	}

	handlePreview(ids: UrlStr[]){
		this.props.setPreview(ids, 'preview');
	}

	handleViewMetadata(id: UrlStr) {
		this.props.setMetadataItem(id);
		this.props.updateFilteredDataObjects();
	}

	render() {
		const { metadata, cart, lookup } = this.props;

		if (metadata === undefined) return null;

		const isInCart = cart.hasItem(metadata.id);
		const actionButtonType = isInCart ? 'remove' : 'add';
		const buttonAction = isInCart ? this.handleRemoveFromCart.bind(this) : this.handleAddToCart.bind(this);
		const specInfo = metadata.specificInfo;

		const acquisition = (specInfo as L2OrLessSpecificMeta).acquisition
			&& (specInfo as L2OrLessSpecificMeta).acquisition;
		const productionInfo = (specInfo as L3SpecificMeta).productionInfo
			? (specInfo as L3SpecificMeta).productionInfo
			: undefined;
		const [isCartEnabled, cartTitle] = metadata.specification ? cartState(metadata.specification.dataLevel, metadata.nextVersion) : [];
		const projectLabel = config.envri === "SITES" ? "Thematic programme" : "Affiliation";
		const datasetSpec = metadata.specification.datasetSpec;
		const checkedObjects = [{
			'dataset': datasetSpec ? datasetSpec.uri : undefined,
			'dobj': metadata.id,
			'spec': metadata.specification.self.uri,
			'nextVersion': metadata.nextVersion
		}];
		const datasets = checkedObjects.map(obj => obj.dataset);
		const previewTypes = lookup ? [lookup.getSpecLookupType(metadata.specification.self.uri)] : [];

		return (
			<div>
				{metadata.submission &&
					<div>
						{metadata.submission.stop ? null :
							<div className="alert alert-warning">Upload not complete, data is missing.</div>
						}
						{metadata.nextVersion &&
							<div className="alert alert-warning">
								A newer version of this data is available:&nbsp;
								<a onClick={this.handleViewMetadata.bind(this, metadata.nextVersion)} style={{cursor: 'pointer'}} className="alert-link">
									View next version
								</a>
							</div>
						}
						<div className="row">
							<div className="col-sm-8">

								<AboutSection metadata={metadata} projectLabel={projectLabel} handleViewMetadata={this.handleViewMetadata.bind(this)}/>

								<ContentSection metadata={metadata} />

								{acquisition &&
									<AcquisitionSection acquisition={acquisition} timezone={timezone[config.envri]} />
								}

								{productionInfo &&
									<ProductionSection production={productionInfo} timezone={timezone[config.envri]} />
								}

								<React.Fragment>
									<h2 style={{ fontSize: 28 }}>Submission</h2>
									{metadata.submission.stop &&
										metadataRow(`Submission time (${timezone[config.envri].label})`,
											formatDateTime(new Date(metadata.submission.stop), timezone[config.envri].offset))
									}
									<br />
								</React.Fragment>

							</div>
							<div className="col-sm-4">
								<div className="row">
									<div className="col-md-12">
										<CartBtn
											style={{ float: 'right', margin: '20px 0 30px 10px' }}
											checkedObjects={[metadata.id]}
											clickAction={buttonAction}
											enabled={isCartEnabled}
											type={actionButtonType}
											title={cartTitle}
										/>
										<PreviewBtn
											style={{ float: 'right', margin: '20px 0 30px 10px' }}
											checkedObjects={checkedObjects}
											datasets={datasets}
											previewTypes={previewTypes}
											clickAction={this.handlePreview.bind(this)}
										/>
									</div>
								</div>
								<br />
								{metadata.coverageGeoJson &&
									<React.Fragment>
										<div className="row">
											<div className="col-md-12">
												{map(metadata.coverageGeoJson, metadata.specification.theme.markerIcon)}
											</div>
										</div>
										<br />
									</React.Fragment>
								}
								<div className="row">
									<div className="col-md-12">
										<label>Metadata</label>
										{metadataLinks(metadata.id, metadata.fileName)}
									</div>
								</div>
							</div>
						</div>
					</div>
				}
			</div>
		);
	}
}

export const MetadataTitle = (metadata?: MetaDataObject & {id: UrlStr}) => {
	if (metadata === undefined) return null;

	const specInfo = metadata.specificInfo;
	const acquisition =  (specInfo as L2OrLessSpecificMeta).acquisition
		? (specInfo as L2OrLessSpecificMeta).acquisition
		: undefined;
	const location = acquisition && acquisition.station &&
		(acquisition.site
			? `${acquisition.site.location?.label} (${acquisition.station.name})`
			: acquisition.station.name);
	const title = (specInfo as L3SpecificMeta).title
		? (specInfo as L3SpecificMeta).title
		: undefined;
	let specLabel = metadata.specification.self.label ?? "";
	if(config.envri === "SITES" && specLabel.includes(',')) specLabel = specLabel.substr(0, specLabel.indexOf(','));

	return (
		<React.Fragment>
			{specInfo &&
				<h1>
					{title || specLabel}
					{location && <span> from {location}</span>}
					{acquisition && acquisition.interval &&
						caption(new Date(acquisition.interval.start), new Date(acquisition.interval.stop))
					}
				</h1>
			}
		</React.Fragment>
	);
};

const caption = (startDate: Date, stopDate: Date) => {
	const startDateString = formatDate(startDate, timezone[config.envri].offset);
	const stopDateString = areDatesDifferent(startDate, stopDate) && ` \u2013 ${formatDate(stopDate, timezone[config.envri].offset)}`;

	return (
		<div className="text-muted">
			<small>{startDateString}{stopDateString}</small>
		</div>
	);
};

const areDatesDifferent = (date1: Date, date2: Date) => {
	const utcDate1 = new Date(date1).setUTCHours(0, 0, 0, 0);
	const utcDate2 = new Date(date2).setUTCHours(0, 0, 0, 0);
	return utcDate1 !== utcDate2;
};

export const metadataRow = (label: string, value: string | ReactElement | ReactElement[], linkify = false) => {
	const text = linkify && typeof value === "string"
		? <LinkifyText text={value} />
		: value;
	const labelColSize = config.envri === "SITES" ? "col-md-3" : "col-md-2";
	const textColSize = config.envri === "SITES" ? "col-md-9 mb-2" : "col-md-10 mb-2";

	return (
		<div className="row">
			<div className={labelColSize}><label>{label}</label></div>
			<div className={textColSize}>{text}</div>
		</div>
	);
};

const metadataLinks = (id: Sha256Str, fileName: string) => {
	const json = `${id}/${fileName}.json`;
	const xml = `${id}/${fileName}.xml`;
	const turtle = `${id}/${fileName}.ttl`;
	return (
		<div>
			<a href={id}>HTML landing page</a> &#8226; <a href={json}>JSON</a> &#8226; <a href={xml}>RDF/XML</a> &#8226; <a href={turtle}>RDF/TURTLE</a>
		</div>
	);
};

const map = (coverage: string, icon?: string) => {
	const style = { border: '1px solid #ddd', width: '100%', height: '400px' };
	return (
		<iframe src={`${commonConfig.metaBaseUri}station/?icon=${icon != undefined ? icon : ""}&coverage=${coverage}`} style={style}></iframe>
	);
};

const cartState = (dataLevel: number, nextVersion?: UrlStr) => {
	if (dataLevel == 0) {
		return [false, "Data level 0 is available on demand only"];
	} else if (nextVersion) {
		return [false, "You can only download the newest version"];
	} else {
		return [true, ""];
	}
};

function stateToProps(state: State){
	return {
		cart: state.cart,
		lookup: state.lookup,
		metadata: state.metadata,
	};
}

function dispatchToProps(dispatch: PortalDispatch | Function){
	return {
		addToCart: (ids: UrlStr[]) => dispatch(addToCart(ids)),
		removeFromCart: (ids: UrlStr[]) => dispatch(removeFromCart(ids)),
		setPreview: (url: UrlStr | UrlStr[], newRoute: Route) => dispatch(switchToPreview(url, newRoute)),
		setMetadataItem: (id: UrlStr) => dispatch(setMetadataItem(id)),
		updateFilteredDataObjects: () => dispatch(updateFilteredDataObjects)
	};
}

export default connect(stateToProps, dispatchToProps)(Metadata);
