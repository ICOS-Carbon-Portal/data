import deepEqual from 'deep-equal';


const obj1 = {
	a: 1,
	b: true,
	c: 'b',
	d: new Date('2000-01-01'),
	e: () => 5,
	f: undefined,
	g: null,
	h: {},
	i: [],
	j: [1, 2, 3],
	k: [{one: 1}, {two: 2}]
};

const obj2 = Object.assign({}, obj1, {k: [{one: 1}, {two: 3}]});
const obj3 = Object.assign({}, obj1, {children: obj1});
const obj4 = Object.assign({}, obj1, {children: obj2});

describe("Testing deepEqual", () => {

	it("matches two identical shallow objects", () => {

		expect(deepEqual(obj1, obj1, {strict: true})).toBe(true);

	});

	it("identifies differences in shallow objects - primitive", () => {

		const diff = Object.assign({}, obj1, {a: 2});
		expect(deepEqual(obj1, diff, {strict: true})).toBe(false);

	});

	it("identifies differences in shallow objects - date: different date", () => {

		const diff = Object.assign({}, obj1, {d: new Date('1999-11-11')});
		expect(deepEqual(obj1, diff, {strict: true})).toBe(false);

	});

	it("identifies differences in shallow objects - date: null", () => {

		const diff = Object.assign({}, obj1, {d: null});
		expect(deepEqual(obj1, diff, {strict: true})).toBe(false);

	});

	it("identifies differences in shallow objects - date: undefined", () => {

		const diff = Object.assign({}, obj1, {d: undefined});
		expect(deepEqual(obj1, diff, {strict: true})).toBe(false);

	});

	it("identifies differences in shallow objects - function", () => {

		const diff = Object.assign({}, obj1, {e: (one) => 5});
		expect(deepEqual(obj1, diff, {strict: true})).toBe(false);

	});

	it("identifies differences in shallow objects - undefined", () => {

		const diff = Object.assign({}, obj1, {f: ''});
		expect(deepEqual(obj1, diff, {strict: true})).toBe(false);

	});

	it("identifies differences in shallow objects - null", () => {

		const diff = Object.assign({}, obj1, {g: ''});
		expect(deepEqual(obj1, diff, {strict: true})).toBe(false);

	});

	it("matches two identical deep objects", () => {

		expect(deepEqual(obj3, obj3, {strict: true})).toBe(true);

	});

	it("identifies differences in deep objects", () => {

		expect(deepEqual(obj3, obj4, {strict: true})).toBe(false);

	});
});