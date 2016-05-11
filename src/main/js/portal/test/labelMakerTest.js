import {composeUniqueLabels} from '../main/models/labelMaker';


describe("composeLabels function", () => {

	it("produces proper unique labels if posible", () => {

		const priorityList = ["a", "b", "c"];
		const labelLists = [
			[
				{label: "a", value: "a"},
				{label: "b", value: "b"},
				{label: "c", value: "c1"}
			],
			[
				{label: "a", value: "a"},
				{label: "b", value: "b"},
				{label: "c", value: "c"}
			],
			[
				{label: "a", value: "a"},
				{label: "b", value: "b3"},
				{label: "c", value: "c"}
			]
		];

		const labels = composeUniqueLabels(priorityList, labelLists);
		expect(labels).toEqual(["b c1", "b c", "b3 c"]);
	});

	it("ensures uniqueness if available labels are not sufficient", () => {
		const priorityList = ["a"];
		const labelLists = [
			[{label: "a", value: "x"}],
			[{label: "a", value: "a"}],
			[{label: "a", value: "a"}]
		];
		const labels = composeUniqueLabels(priorityList, labelLists);
		expect(labels).toEqual(["x_1", "a_2", "a_3"]);
	});

	it("uses highest-priority label as basis if all labels are the same", () => {
		const priorityList = ["a", "b"];
		const labelLists = [
			[
				{label: "a", value: "a"},
				{label: "b", value: "b"}
			],
			[
				{label: "a", value: "a"},
				{label: "b", value: "b"}
			],
			[
				{label: "a", value: "a"},
				{label: "b", value: "b"}
			]
		];
		const labels = composeUniqueLabels(priorityList, labelLists);
		expect(labels).toEqual(["a_1", "a_2", "a_3"]);
	});

	it("uses required labels even if they are identical", () => {
		const priorityList = ["a", "b"];
		const labelLists = [
			[
				{label: "a", value: "a"},
				{label: "b", value: "b1"}
			],
			[
				{label: "a", value: "a"},
				{label: "b", value: "b2"}
			],
			[
				{label: "a", value: "a"},
				{label: "b", value: "b3"}
			]
		];
		const labels = composeUniqueLabels(priorityList, labelLists, ', ', 1);
		expect(labels).toEqual(["a, b1", "a, b2", "a, b3"]);
	});

});

