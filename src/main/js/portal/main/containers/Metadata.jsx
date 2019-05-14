import React, { Component } from 'react';
import { connect } from 'react-redux';
import CartBtn from '../components/buttons/CartBtn.jsx';
import PreviewBtn from '../components/buttons/PreviewBtn.jsx';
import { formatBytes } from '../utils';
import commonConfig from '../../../common/main/config';
import { setPreviewItem } from '../actions';

class Metadata extends Component {
	constructor(props) {
		super(props);
	}

	handleAddToCart(objInfo) {
		this.props.addToCart(objInfo);
	}

	handleRemoveFromCart(objInfo) {
		this.props.removeFromCart(objInfo);
	}

	handlePreview(id){
		if (this.props.setPreviewItem) this.props.setPreviewItem(id);
	}

	render() {
		const { metadata, cart, lookup } = this.props;
		const isInCart = cart.hasItem(metadata.id);
		const actionButtonType = isInCart ? 'remove' : 'add';
		const buttonAction = isInCart ? this.handleRemoveFromCart.bind(this) : this.handleAddToCart.bind(this);
		const station = metadata && metadata.specificInfo && metadata.specificInfo.acquisition && metadata.specificInfo.acquisition.station;

		return (
			<div>
				{metadata && metadata.submission &&
					<div>
						<div className="row">
							<div className="col-sm-8">
								<div className="row">
									<div className="col-md-2">
									</div>
									<div className="col-md-10">
										<CartBtn
											style={{ float: 'left', margin: '20px 10px 30px 0' }}
											checkedObjects={[metadata.id]}
											clickAction={buttonAction}
											enabled={metadata.specification.dataLevel!=0}
											type={actionButtonType}
										/>
										<PreviewBtn
											style={{ float: 'left', margin: '20px 10px 30px 0' }}
											checkedObjects={[{'dobj': metadata.id, 'spec': metadata.specification.self.uri}]}
											clickAction={this.handlePreview.bind(this)}
											lookup={lookup}
										/>
									</div>
								</div>
								{metadata.submission.stop ? null :
									<div className="alert alert-warning">Upload not complete, data is missing.</div>
								}
								{metadata.nextVersion &&
									<div className="alert alert-warning">A newer version of this data is availble: <a href={metadata.nextVersion} className="alert-link">{metadata.nextVersion}</a></div>
								}
								{metadata.specificInfo.description &&
									metadataRow("Description", metadata.specificInfo.description)
								}
								{metadata.doi &&
									metadataRow("DOI", doiLink(metadata.doi))
								}
								{metadata.pid &&
									metadataRow("PID", doiLink(metadata.pid))
								}
								{metadataRow("Affiliation", metadata.specification.project.label)}
								{metadataRow("Type", metadata.specification.self.label)}
								{metadataRow("Level", metadata.specification.dataLevel)}
								{metadataRow("File name", metadata.fileName)}
								{metadataRow("Size", formatBytes(metadata.size, 0))}
								<br />
								{station &&
									<React.Fragment>
										metadataRow("Station", <a href={station.org.self.uri}>{station.name}</a>)}
										<br />
									</React.Fragment>
								}
								{metadata.specificInfo.acquisition &&
									<React.Fragment>
										{metadataRow("Time coverage", `${formatDateTime(new Date(metadata.specificInfo.acquisition.interval.start))}
										\u2013
										${formatDateTime(new Date(metadata.specificInfo.acquisition.interval.stop))}`)}
										<br />
									</React.Fragment>
								}
								{metadata.citationString &&
									<React.Fragment>
										{metadataRow("Citation", metadata.citationString)}
										<br />
									</React.Fragment>
								}
								
								{metadata.previousVersion &&
									<React.Fragment>
										{metadataRow("Previous version", metadata.previousVersion)}
										<br />
									</React.Fragment>
								}
								{metadata.specificInfo.productionInfo &&
									<React.Fragment>
										{metadataRow("Made by", personLink(metadata.specificInfo.productionInfo.creator))}
										{metadataRow("Contributors", metadata.specificInfo.productionInfo.contributors.map(contributor => {
											return(personLink(contributor))
										}))}
										{metadataRow("Host organization", <a href={metadata.specificInfo.productionInfo.host.self.uri}>{metadata.specificInfo.productionInfo.host.name}</a>)}
										{metadata.specificInfo.productionInfo.comment && metadataRow("Comment", metadata.specificInfo.productionInfo.comment)}
										{metadataRow("Creation date", formatDateTime(new Date(metadata.specificInfo.productionInfo.dateTime)))}
									</React.Fragment>
								}
							</div>
							<div className="col-sm-4">
								{metadata.coverageGeoJson &&
									<React.Fragment>
										<div className="row">
											<div className="col-md-12">
												{map(metadata.specification.theme.markerIcon, metadata.coverageGeoJson)}
											</div>
										</div>
										<br />
									</React.Fragment>
								}
								<div className="row">
									<div className="col-md-12">
										<label>Metadata download</label>
										{metadataDownload(metadata.id, metadata.fileName)}
									</div>
								</div>
								<br />
								<div className="row">
									<div className="col-md-12">
										<label>Technical metadata</label>
										<div><a href={metadata.id}>View metadata page <span className="glyphicon glyphicon-share"></span></a></div>
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

export const MetadataTitle = props => {
	const { metadata } = props;
	const station = metadata && metadata.specificInfo && metadata.specificInfo.acquisition && metadata.specificInfo.acquisition.station;
	return (
		<React.Fragment>
			{metadata && metadata.specificInfo &&
				<h1>
					{metadata.specificInfo.title || metadata.specification.self.label}
					{station && <span> from {station.name}</span>}
					{metadata.specificInfo.acquisition &&
						caption(new Date(metadata.specificInfo.acquisition.interval.start), new Date(metadata.specificInfo.acquisition.interval.stop))
					}
				</h1>
			}
		</React.Fragment>
	);
};

const caption = (startDate, stopDate) => {
	return (
		<div className="text-muted">
			<small>{formatDate(startDate)}{areDatesDifferent(startDate, stopDate) && ` \u2013 ${formatDate(stopDate)}`}</small>
		</div>
	);
};

const areDatesDifferent = (date1, date2) => {
	return date1.setUTCHours(0,0,0,0) != date2.setUTCHours(0,0,0,0) ? true : false;
};

const metadataRow = (label, value) => {
	return (
		<div className="row">
			<div className="col-md-2"><label>{label}</label></div>
			<div className="col-md-10">{value}</div>
		</div>
	);
};

const doiLink = (doi) => {
	return (
		<span>
			<a href={`https://doi.org/${doi}`}>{doi}</a>&nbsp;
			(<a target="_blank" href={`https://search.datacite.org/works/${doi}`}>metadata</a>)
		</span>
	);
};

const metadataDownload = (id, fileName) => {
	const json = `${id}/${fileName}.json`;
	const xml = `${id}/${fileName}.xml`;
	const turtle = `${id}/${fileName}.ttl`;
	return (
		<div>
			<a href={json}>JSON</a> &#8226; <a href={xml}>RDF/XML</a> &#8226; <a href={turtle}>RDF/TURTLE</a>
		</div>
	);
};

const map = (icon, coverage) => {
	const style = { border: '1px solid #ddd', width: '100%', height: '400px' };
	return (
		<iframe src={`${commonConfig.metaBaseUri}station/?icon=${icon != undefined ? icon : ""}&coverage=${coverage}`} style={style}></iframe>
	);
};

const personLink = (person) => {
	return <a href={person.self.uri} key={person.self.uri}>
			{person.firstName} {person.lastName}
		</a>;
}

function formatDate(d) {
	if (!d) return '';

	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function formatDateTime(d) {
	if (!d) return '';

	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
}

function pad2(s) {
	return ("0" + s).substr(-2, 2);
}

function dispatchToProps(dispatch){
	return {
		setPreviewItem: id => dispatch(setPreviewItem(id)),
	};
}

export default connect(state => state.toPlainObject, dispatchToProps)(Metadata);
