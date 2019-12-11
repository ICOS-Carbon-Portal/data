import {useState, useEffect} from 'react';

type Updater<T> = (v?: any) => void

export function useControllableProp<T>(value?: T, updater?: Updater<T>, defaultVal?: T) {
	const isControlled = value !== undefined && updater !== undefined;
	const [internalVal, setInternalValue] = useState(
		isControlled ? value : defaultVal,
	);
	const currentVal = isControlled ? value : internalVal;
	const currentUpdater: Updater<T> = isControlled && updater !== undefined
		? updater
		: (v: T) => setInternalValue(v);

	useEffect(() => {
		if (isControlled) {
			setInternalValue(value);
		}
	}, [isControlled, value]);

	return [currentVal, currentUpdater];
}
