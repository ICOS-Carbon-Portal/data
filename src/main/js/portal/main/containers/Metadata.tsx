import React, { Component, ReactElement } from 'react';
import { connect } from 'react-redux';
import CartBtn from '../components/buttons/CartBtn.jsx';
import PreviewBtn from '../components/buttons/PreviewBtn.jsx';
import { formatDate } from '../utils';
import commonConfig from '../../../common/main/config';
import {LinkifyText} from "../components/LinkifyText";
import {MetaDataObject, State} from "../models/State";
import {PortalDispatch} from "../store";
import {addToCart, removeFromCart, setMetadataItem, setPreviewItem, updateFilteredDataObjects} from "../actions";
import {Sha256Str, UrlStr} from "../backend/declarations";
import { L2OrLessSpecificMeta, L3SpecificMeta, PlainStaticObject} from "../../../common/main/metacore";
import config from '../config';
import AboutSection from '../components/metadata/AboutSection';
import AcquisitionSection from '../components/metadata/AcquisitionSection';
import ProductionSection from '../components/metadata/ProductionSection';


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
		this.props.setPreviewItem(ids);
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
		const specInfo = metadata.specificInfo

		const acquisition = (specInfo as L2OrLessSpecificMeta).acquisition
			&& (specInfo as L2OrLessSpecificMeta).acquisition;
		const productionInfo = (specInfo as L3SpecificMeta).productionInfo
			? (specInfo as L3SpecificMeta).productionInfo
			: undefined;
		const [isCartEnabled, cartTitle] = metadata.specification ? cartState(metadata.specification.dataLevel, metadata.nextVersion) : [];
		const prevVersions = Array.isArray(metadata.previousVersion)
			? metadata.previousVersion
			: metadata.previousVersion ? [metadata.previousVersion] : [];
		const projectLabel = config.envri === "SITES" ? "Thematic programme" : "Affiliation";
		const self = this;

		return (
			<div>
				{metadata.submission &&
					<div>
						{metadata.submission.stop ? null :
							<div className="alert alert-warning">Upload not complete, data is missing.</div>
						}
						{metadata.nextVersion &&
							<div className="alert alert-warning">
								A newer version of this data is available:
								<a onClick={this.handleViewMetadata.bind(this, metadata.nextVersion)} style={{cursor: 'pointer'}} className="alert-link">
									View next version
								</a>
							</div>
						}
						<div className="row">
							<div className="col-sm-8">
								<div className="row">
									<div className="col-md-10 col-md-offset-2">
										<CartBtn
											style={{ float: 'left', margin: '20px 10px 30px 0' }}
											checkedObjects={[metadata.id]}
											clickAction={buttonAction}
											enabled={isCartEnabled}
											type={actionButtonType}
											title={cartTitle}
										/>
										<PreviewBtn
											style={{ float: 'left', margin: '20px 10px 30px 0' }}
											checkedObjects={[{'dobj': metadata.id, 'spec': metadata.specification.self.uri, 'nextVersion': metadata.nextVersion}]}
											clickAction={this.handlePreview.bind(this)}
											lookup={lookup}
										/>
									</div>
								</div>

								<AboutSection metadata={metadata} projectLabel={projectLabel}/>

								{acquisition &&
									<AcquisitionSection acquisition={acquisition}/>
								}

								{metadata.citationString &&
									<React.Fragment>
										{metadataRow("Citation", metadata.citationString)}
										<br />
									</React.Fragment>
								}

								{prevVersions.map((previousVersion, i) =>
									<React.Fragment key={"key_" + i}>
										{metadataRow(
											"Previous version",
											<a onClick={self.handleViewMetadata.bind(self, previousVersion)} style={{cursor: 'pointer'}}>View previous version</a>
										)}
									</React.Fragment>
								)}
								{prevVersions.length > 0 && <br />}
								{productionInfo &&
									<ProductionSection production={productionInfo} />
								}
								{metadata.specification.documentation && metadata.specification.documentation.length > 0 &&
									<React.Fragment>
										{metadataRow("Documentation", documentationLinks(metadata.specification.documentation))}
									</React.Fragment>
								}
							</div>
							<div className="col-sm-4">
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

	const specInfo = metadata.specificInfo
	const acquisition =  (specInfo as L2OrLessSpecificMeta).acquisition
		? (specInfo as L2OrLessSpecificMeta).acquisition
		: undefined;
	const station = acquisition && acquisition.station
		? acquisition.station
		: undefined;
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
					{station && <span> from {station.name}</span>}
					{acquisition && acquisition.interval &&
						caption(new Date(acquisition.interval.start), new Date(acquisition.interval.stop))
					}
				</h1>
			}
		</React.Fragment>
	);
};

const caption = (startDate: Date, stopDate: Date) => {
	return (
		<div className="text-muted">
			<small>{formatDate(startDate)}{areDatesDifferent(startDate, stopDate) && ` \u2013 ${formatDate(stopDate)}`}</small>
		</div>
	);
};

const areDatesDifferent = (date1: Date, date2: Date) => {
	return date1.setUTCHours(0, 0, 0, 0) !== date2.setUTCHours(0, 0, 0, 0);
};

export const metadataRow = (label: string, value: string | ReactElement | ReactElement[], linkify = false) => {
	const text = linkify && typeof value === "string"
		? <LinkifyText text={value} />
		: value;

	return (
		<div className="row">
			<div className="col-md-2"><label>{label}</label></div>
			<div className="col-md-10 mb-2">{text}</div>
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

const documentationLinks = (documentation: PlainStaticObject[]) => {
	return documentation.map((doc, i) =>
		<React.Fragment key={"key_" + i}>
			<a href={doc.res}>{doc.name}</a>
			{i != documentation.length - 1 && <br />}
		</React.Fragment>
	)
}

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
		setPreviewItem: (id: UrlStr[]) => dispatch(setPreviewItem(id)),
		setMetadataItem: (id: UrlStr) => dispatch(setMetadataItem(id)),
		updateFilteredDataObjects: () => dispatch(updateFilteredDataObjects)
	};
}

export default connect(stateToProps, dispatchToProps)(Metadata);
