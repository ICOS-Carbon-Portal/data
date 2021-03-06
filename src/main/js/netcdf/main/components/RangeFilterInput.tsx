import React, { useState, useEffect, CSSProperties, ChangeEvent } from 'react';
import { MinMax, RangeValues, State } from '../models/State';

const numberReg = /^-?\d+(\.\d+|\.\d+[eE]-?\d+|[eE]-?\d+)?$/;
const resetLnkStyle = { marginLeft: 10, cursor: 'pointer' };

type OurProps = {
	isActive: boolean
	onClose: () => void
	minMax: State['minMax']
	fullMinMax: State['fullMinMax']
	rangeValues: RangeValues
	rangeFilterChanged: (numericRangeValues: NumericRangeValues) => void
}
type ErrorMessages = {
	min?: string
	max?: string
}
type OurRangeValues = {
	minRange?: string
	maxRange?: string
}
type NumericRangeValues<T = string | number> = {
	minRange?: T
	minIsNumberlike: boolean
	maxRange?: T
	maxIsNumberlike: boolean
	isReady: boolean
}

export default function RangeFilterInput(props: OurProps) {
	const {isActive, rangeValues, rangeFilterChanged} = props;

	const [show, setShow] = useState(isActive);
	const [prevProps, setPrevProps] = useState(props);
	// ourRangeValues stores values as strings
	const [ourRangeValues, setOurRangeValues] = useState<OurRangeValues>({});
	const [maxRangeErrMsg, setMaxRangeErrMsg] = useState<string>();
	const [minRangeErrMsg, setMinRangeErrMsg] = useState<string>();

	useEffect(() => {
		if (prevProps.rangeValues.maxRange !== rangeValues.maxRange || prevProps.rangeValues.minRange !== rangeValues.minRange) {
			setOurRangeValues(toStr(rangeValues));
			setPrevProps(props);
		}

		if (isActive !== show) setShow(isActive);

	}, [rangeValues, isActive]);

	const toStr = (rangeValues: RangeValues) => ({
		minRange: rangeValues.minRange ? rangeValues.minRange + '' : undefined,
		maxRange: rangeValues.maxRange ? rangeValues.maxRange + '' : undefined
	});

	const minValChanged = (ev: ChangeEvent<HTMLInputElement>) => {
		rangeValueChanged('minRange', ev.target.value);
	};

	const maxValChanged = (ev: ChangeEvent<HTMLInputElement>) => {
		rangeValueChanged('maxRange', ev.target.value);
	};

	const rangeValueChanged = (key: keyof RangeValues, value: string) => {
		const rangeValues = { ...ourRangeValues };

		// Kepp values as strings in the front end form
		rangeValues[key] = value === "" ? undefined : value;
		setOurRangeValues(rangeValues);

		const numericRangeValues = getNumericRangeValues(rangeValues);
		const { minRange, maxRange, minIsNumberlike, maxIsNumberlike } = numericRangeValues;
		const errorMessages: ErrorMessages = {
			min: undefined,
			max: undefined
		};

		if (maxRange && minRange && maxRange <= minRange) {
			errorMessages.min = 'Must be smaller than max range';
			errorMessages.max = 'Must be larger than min range';
		}

		if (maxRange && props.fullMinMax && maxRange > props.fullMinMax.max)
			errorMessages.max = 'Must be smaller than raster max value';

		if (maxRange && props.fullMinMax && maxRange <= props.fullMinMax.min)
			errorMessages.max = 'Must be larger than raster min value';

		if (minRange && props.fullMinMax && minRange < props.fullMinMax.min)
			errorMessages.min = 'Must be larger than raster min value';

		if (minRange && props.fullMinMax && minRange >= props.fullMinMax.max)
			errorMessages.min = 'Must be smaller than raster max value';

		if (!minIsNumberlike)
			errorMessages.min = 'Must be a number';
		
		if (!maxIsNumberlike)
			errorMessages.max = 'Must be a number';

		setMinRangeErrMsg(errorMessages.min);
		setMaxRangeErrMsg(errorMessages.max);

		if (numericRangeValues.isReady && errorMessages.min === undefined && errorMessages.max === undefined) {
			rangeFilterChanged(numericRangeValues as NumericRangeValues<number>);
		}
	}

	const getNumericRangeValues = (rangeValues: OurRangeValues): NumericRangeValues => {
		const min = parseRangeValue(rangeValues.minRange);
		const max = parseRangeValue(rangeValues.maxRange);

		return {
			minRange: min.val,
			minIsNumberlike: min.isNumberlike,
			maxRange: max.val,
			maxIsNumberlike: max.isNumberlike,
			isReady: min.isNumberlike && max.isNumberlike
		}
	}

	const parseRangeValue = (rangeValue?: string | number) => {
		if (rangeValue === undefined)
			return { val: undefined, isNumberlike: true };
		
		const isNumber = numberReg.test(rangeValue + '');

		return isNumber
			? { val: parseFloat(rangeValue + ''), isNumberlike: true }
			: { val: rangeValue, isNumberlike: false };
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

	const closeBtnStyle = { float: 'right', fontSize: '150%', cursor: 'pointer' } as CSSProperties;

	if (!show) return null;

	return (
		<div style={{position:'absolute', width:300, zIndex:9999, top:135, right:156}}>
			<div className="panel panel-default" style={{margin:0}}>
				<div id="cp-drag-element" className="panel-heading">
					<span style={{ fontWeight: 'bold', fontSize: '110%' }}>Set min/max range</span>
					<span className="glyphicon glyphicon-remove-circle" style={closeBtnStyle} onClick={props.onClose} title="Close" />
				</div>

				<div className="panel-body" style={{padding:'5px', height: 190}}>
					<div className="row">
						<div className="col-md-12">
							<div className={maxRangeCls}>

								<label>Max range</label>
								<a onClick={() => rangeValueChanged('maxRange', '')} style={resetLnkStyle}>Clear</a>

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
								<a onClick={() => rangeValueChanged('minRange', '')} style={resetLnkStyle}>Clear</a>

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

const ErrorMsg = ({msg}: {msg?: string}) => {
	if (msg === undefined)
		return <span className="help-block">&nbsp;</span>;

	return <span className="help-block">{msg}</span>;
};
