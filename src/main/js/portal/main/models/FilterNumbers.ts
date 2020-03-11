import {NumberFilterCategories} from "../config";


export interface NumberFilterValidation {
	category: NumberFilterCategories
	type?: 'limit' | 'span' | 'list'
	isValid: boolean
	txt: string
	vals: number[]
	cmp: ('=' | '<=' | '>=')[]
}

export interface FilterNumberSerialized {
	cat: NumberFilterCategories
	txt: string
}

export class FilterNumbers {
	private list: FilterNumber[];

	constructor(filters: FilterNumber[] = []){
		this.list = filters;
	}

	get serialize(): FilterNumberSerialized[]{
		return this.validFilters.map(nf => ({
			cat: nf.category,
			txt: nf.txt
		}));
	}

	static deserialize(jsonFilterNumber: FilterNumberSerialized[]){
		return new FilterNumbers(jsonFilterNumber.map(jfn => new FilterNumber(jfn.cat, jfn.txt)));
	};

	restore(jsonFilterNumber: FilterNumberSerialized[]){
		const restoredFilterNumbers = FilterNumbers.deserialize(jsonFilterNumber);
		const newList = this.list.map(nf => restoredFilterNumbers.getFilter(nf.category) ?? nf);
		return new FilterNumbers(newList);
	}

	withFilter(filter: FilterNumber){
		return this.list.length > 0
			? new FilterNumbers(this.list.map(nf => nf.category === filter.category ? filter : nf))
			: new FilterNumbers([filter]);
	}

	get validFilters(){
		return this.list.filter(nf => nf.isValid && nf.vals.length > 0 && nf.vals.length === nf.cmp.length);
	}

	get hasFilters(){
		return this.validFilters.length > 0;
	}

	getFilter(category: NumberFilterCategories){
		return this.list.find(nf => nf.category === category);
	}
}

export class FilterNumber {
	private validation: NumberFilterValidation;

	constructor(category: NumberFilterCategories, value?: string){
		this.validation = validate(category, value ?? '');
	}

	validate(value: string){
		return new FilterNumber(this.category, value);
	}

	get category(){
		return this.validation.category;
	}

	get type(){
		return this.validation.type;
	}

	get isValid(){
		return this.validation.isValid;
	}

	get txt(){
		return this.validation.txt;
	}

	get vals(){
		return this.validation.vals;
	}

	get cmp(){
		return this.validation.cmp;
	}

}

const validate = (category: NumberFilterCategories, value: string): NumberFilterValidation => {
	if (value === '') {
		return {
			category,
			txt: value,
			isValid: true,
			vals: [],
			cmp: []
		};
	}

	const minMax = value.match(/^(<|>){1}(\d+\.*\d*)$/);

	if (minMax !== null){
		return {
			category,
			txt: value,
			type: 'limit',
			isValid: true,
			vals: [parseFloat(minMax[2])],
			cmp: minMax[1] === '<' ? ['<='] : ['>=']
		};
	}

	const span = value.match(/^(\d+\.*\d*)-(\d+\.*\d*)$/);

	if (span !== null){
		return {
			category,
			txt: value,
			type: 'span',
			isValid: true,
			vals: [parseFloat(span[1]), parseFloat(span[2])].sort((a, b) => a - b),
			cmp: ['>=', '<=']
		};
	}

	//only single value for now
	const list = [value];//.split(' ');

	if (list.length){
		return list.reduce<NumberFilterValidation>((acc, curr) => {
			const num = curr.match(/^(\d+\.*\d*)$/);

			if (num !== null){
				return {
					category,
					txt: value,
					type: 'list',
					isValid: acc.isValid,
					vals: acc.vals.concat(parseFloat(num[1])),
					cmp: acc.cmp.concat('=')
				}
			} else {
				return {
					category,
					txt: value,
					type: 'list',
					isValid: false,
					vals: [],
					cmp: []
				}
			}
		}, {
			category,
			txt: value,
			type: 'list',
			isValid: true,
			vals: [],
			cmp: []
		});
	}

	return {
		category,
		txt: value,
		isValid: false,
		vals: [],
		cmp: []
	};
};
