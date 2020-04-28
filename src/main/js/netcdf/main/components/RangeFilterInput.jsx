import React, { useState, useEffect } from 'react';

const numberReg = /^-?\d+(\.\d+|\.\d+[eE]-?\d+|[eE]-?\d+)?$/;

export default function RangeFilterInput(props) {
	const {isActive, rangeValues, rangeFilterChanged, minMax} = props;

	const [show, setShow] = useState(isActive);
	const [prevProps, setPrevProps] = useState(props);
	const [ourRangeValues, setOurRangeValues] = useState({});
	const [maxRangeErrMsg, setMaxRangeErrMsg] = useState();
	const [minRangeErrMsg, setMinRangeErrMsg] = useState();

	useEffect(_ => {
		if (prevProps.rangeValues.maxRange !== rangeValues.maxRange || prevProps.rangeValues.minRange !== rangeValues.minRange) {
			// To preserve scientific notation in input element, compare incoming props with our state using loose equality
			if (ourRangeValues.maxRange != rangeValues.maxRange)
				setOurRangeValues({...ourRangeValues, ...{'maxRange': rangeValues.maxRange}});

			else if (ourRangeValues.minRange != rangeValues.minRange)
				setOurRangeValues({...ourRangeValues, ...{'minRange': rangeValues.minRange}});

			setPrevProps(props);
		}

		if (isActive !== show) setShow(isActive);

	}, [rangeValues, isActive]);

	const minValChanged = (ev) => {
		const isNumber = numberReg.test(ev.target.value);
		rangeValueChanged(isNumber, 'minRange', ev.target);
	};

	const maxValChanged = (ev) => {
		const isNumber = numberReg.test(ev.target.value);
		rangeValueChanged(isNumber, 'maxRange', ev.target);
	};

	const rangeValueChanged = (isNumber, key, input) => {
		if (input.value === "") {
			setOurRangeValues({...ourRangeValues, ...{[key]: undefined}});
			rangeFilterChanged({...ourRangeValues, ...{[key]: undefined}});
			setMaxRangeErrMsg();
			return;
		}

		setOurRangeValues({...ourRangeValues, ...{[key]: input.value}});

		if (isNumber) {
			const val = parseFloat(input.value);
			const maxRange = key === "maxRange" ? val : ourRangeValues.maxRange;
			const minRange = key === "minRange" ? val : ourRangeValues.minRange;

			if (maxRange < minRange) {
				setMaxRangeErrMsg('Must be larger than min range');
				setMinRangeErrMsg('Must be smaller than max range');

			} else if (maxRange > minMax.max){
				setMaxRangeErrMsg('Must be smaller than raster max value');

			} else if (minRange < minMax.min){
				setMinRangeErrMsg('Must be larger than raster min value');

			} else {
				setMaxRangeErrMsg();
				setMinRangeErrMsg();

				rangeFilterChanged({[key]: val});
			}

		} else {
			if (key === "maxRange")
				if (input.value === "")
					setMaxRangeErrMsg();
				else
					setMaxRangeErrMsg('Must be a number');
			else if (input.value === "")
				setMinRangeErrMsg();
			else
				setMinRangeErrMsg('Must be a number');
		}
	};

	// To preserve scientific notation in input element, compare incoming props with our state using loose equality
	const minRange = rangeValues.minRange == ourRangeValues.minRange
		? ourRangeValues.minRange
		: prevProps.rangeValues.minRange === rangeValues.minRange
			? ourRangeValues.minRange
			: rangeValues.minRange;

	const maxRange = rangeValues.maxRange == ourRangeValues.maxRange
		? ourRangeValues.maxRange
		: prevProps.rangeValues.maxRange === rangeValues.maxRange
			? ourRangeValues.maxRange
			: rangeValues.maxRange;

	const maxRangeCls = maxRangeErrMsg === undefined ? 'form-group' : 'form-group has-error';
	const minRangeCls = minRangeErrMsg === undefined ? 'form-group' : 'form-group has-error';

	if (!show) return null;

	return (
		<div style={{position:'absolute', width:300, zIndex:9999, top:135, right:156}}>
			<div className="panel panel-default" style={{margin:0}}>
				<div id="cp-drag-element" className="panel-heading">
					<span style={{fontWeight:'bold', fontSize:'110%'}}>Set min/max range</span>
				</div>

				<div className="panel-body" style={{padding:'5px', height: 190}}>
					<div className="row">
						<div className="col-md-12">
							<div className={maxRangeCls}>

								<label>Max range</label>
								<input
									type="text"
									className="form-control"
									value={maxRange ?? ''}
									onChange={maxValChanged}
								/>
								<ErrorMsg msg={maxRangeErrMsg} />

							</div>
						</div>
					</div>

					<div className="row">
						<div className="col-md-12">
							<div className={minRangeCls}>

								<label>Min range</label>
								<input
									type="text"
									className="form-control"
									value={minRange ?? ''}
									onChange={minValChanged}
								/>
								<ErrorMsg msg={minRangeErrMsg} />

							</div>
						</div>
					</div>
				</div>
			</div>

		</div>
	);
}

const ErrorMsg = ({msg}) => {
	if (msg === undefined)
		return <span className="help-block">&nbsp;</span>;

	return <span className="help-block">{msg}</span>;
};
