import LinearCache from '../src/main/models/LinearCache';


const fetcher = (offset, limit) => Promise.resolve(Array.from({length: limit}, (_, i) => offset + i + 1));
const fetcherMax20 = (offset, limit) =>
	Promise.resolve(Array.from({length: offset + limit <= 20 ? limit : 20 - offset}, (_, i) => offset + i + 1));


const debug = (lc, d) => {
	console.log({cache: lc.cache, offset: lc.offset, data: d, length: lc.length, isDataEndReached: lc.isDataEndReached});
};


describe("Testing LinearCache", () => {

	it("fills cache once and returns data", () => {

		const lc = new LinearCache(fetcher, 0, 10);

		lc.fetch(0, 5)
			.then(d => {
				debug(lc, d);
				expect(d).toEqual([1,2,3,4,5]);
				expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9,10]);
				expect(lc.length).toBe(10, "length");
				expect(lc.offset).toBe(0, "offset");
				expect(lc.isDataEndReached).toBe(false, "isDataEndReached");
			});

	});

	// it("fills cache once and returns data in two calls", () => {
	//
	// 	const lc = new LinearCache(fetcher, 0, 10);
	//
	// 	lc.fetch(0, 5)
	// 		.then(d => {
	// 			expect(d).toEqual([1,2,3,4,5]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9,10]);
	// 			expect(lc.length).toBe(10, "length 1");
	// 			expect(lc.offset).toBe(0, "offset 1");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 1");
	// 			return lc.fetch(5, 5);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([6,7,8,9,10]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9,10]);
	// 			expect(lc.length).toBe(10, "length 2");
	// 			expect(lc.offset).toBe(0, "length 2");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 2");
	// 		});
	//
	// });
	//
	// it("fills cache twice (no gap) and returns two calls", () => {
	//
	// 	const lc = new LinearCache(fetcher, 0, 10);
	//
	// 	lc.fetch(0, 10)
	// 		.then(d => {
	// 			expect(d).toEqual([1,2,3,4,5,6,7,8,9,10]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9,10]);
	// 			expect(lc.length).toBe(10, "length 1");
	// 			expect(lc.offset).toBe(0, "offset 1");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 1");
	// 			return lc.fetch(10, 10);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(20, "length 2");
	// 			expect(lc.offset).toBe(0, "offset 2");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 2");
	// 		});
	//
	// });
	//
	// it("resets cache since call adds a gap - new data is after", () => {
	//
	// 	const lc = new LinearCache(fetcher, 0, 10);
	//
	// 	lc.fetch(0, 10)
	// 		.then(d => {
	// 			expect(d).toEqual([1,2,3,4,5,6,7,8,9,10]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9,10]);
	// 			expect(lc.length).toBe(10, "length 1");
	// 			expect(lc.offset).toBe(0, "offset 1");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 1");
	// 			return lc.fetch(15, 10);
	// 		})
	// 		.then(d => {
	// 			 expect(d).toEqual([16,17,18,19,20,21,22,23,24,25]);
	// 			 expect(lc.cache).toEqual([16,17,18,19,20,21,22,23,24,25]);
	// 			 expect(lc.length).toBe(10, "length 2");
	// 			 expect(lc.offset).toBe(15, "offset 2");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 2");
	// 		});
	//
	// });
	//
	// it("resets cache since call adds a gap - new data is before", () => {
	//
	// 	const lc = new LinearCache(fetcher, 20, 10);
	//
	// 	lc.fetch(20, 5)
	// 		.then(d => {
	// 			expect(d).toEqual([21,22,23,24,25]);
	// 			expect(lc.cache).toEqual([21,22,23,24,25,26,27,28,29,30]);
	// 			expect(lc.length).toBe(10, "length 1");
	// 			expect(lc.offset).toBe(20, "offset 1");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 1");
	// 			return lc.fetch(0, 5);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([1,2,3,4,5]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9,10]);
	// 			expect(lc.length).toBe(10, "length 2");
	// 			expect(lc.offset).toBe(0, "offset 2");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 2");
	// 		})
	//
	// });
	//
	// it("resets cache since new data envelops cache", () => {
	//
	// 	const lc = new LinearCache(fetcher, 0, 5);
	//
	// 	lc.fetch(0, 5)
	// 		.then(d => {
	// 			expect(d).toEqual([1,2,3,4,5]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5]);
	// 			expect(lc.length).toBe(5, "length 1");
	// 			expect(lc.offset).toBe(0, "offset 1");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 1");
	// 			return lc.fetch(10, 5);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([11,12,13,14,15]);
	// 			expect(lc.cache).toEqual([11,12,13,14,15]);
	// 			expect(lc.length).toBe(5, "length 2");
	// 			expect(lc.offset).toBe(10, "offset 2");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 2");
	// 			return lc.fetch(5, 15);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.cache).toEqual([6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(15, "length 3");
	// 			expect(lc.offset).toBe(5, "offset 3");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 3");
	// 		});
	//
	// });
	//
	// it("fills cache twice (partial overlap) and returns two calls", () => {
	//
	// 	const lc = new LinearCache(fetcher, 0, 10);
	//
	// 	lc.fetch(0, 10)
	// 		.then(d => {
	// 			expect(d).toEqual([1,2,3,4,5,6,7,8,9,10]);
	// 			expect(lc.length).toBe(10, "length 1");
	// 			expect(lc.offset).toBe(0, "offset 1");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 1");
	// 			return lc.fetch(5, 10);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([6,7,8,9,10,11,12,13,14,15]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
	// 			expect(lc.length).toBe(15, "length 2");
	// 			expect(lc.offset).toBe(0, "offset 2");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 3");
	// 		});
	//
	// });
	//
	// it("fills cache with partial overlap sometimes", () => {
	//
	// 	const lc = new LinearCache(fetcherMax20, 0, 5);
	//
	// 	lc.fetch(0, 2)
	// 		.then(d => {
	// 			expect(d).toEqual([1,2]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5]);
	// 			expect(lc.length).toBe(5, "length 1");
	// 			expect(lc.offset).toBe(0, "offset 1");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 1");
	// 			return lc.fetch(2, 2);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([3,4]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5]);
	// 			expect(lc.length).toBe(5, "length 2");
	// 			expect(lc.offset).toBe(0, "offset 2");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 3");
	// 			return lc.fetch(4, 2);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([5,6]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9]);
	// 			expect(lc.length).toBe(9, "length 3");
	// 			expect(lc.offset).toBe(0, "offset 3");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 3");
	// 		});
	//
	// });
	//
	// it("fills cache with partial overlap sometimes - max 20", () => {
	//
	// 	const lc = new LinearCache(fetcherMax20, 10, 5);
	//
	// 	lc.fetch(10, 4)
	// 		.then(d => {
	// 			expect(d).toEqual([11,12,13,14]);
	// 			expect(lc.cache).toEqual([11,12,13,14,15]);
	// 			expect(lc.length).toBe(5, "length 1");
	// 			expect(lc.offset).toBe(10, "offset 1");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 1");
	// 			return lc.fetch(14, 4);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([15,16,17,18]);
	// 			expect(lc.cache).toEqual([11,12,13,14,15,16,17,18,19]);
	// 			expect(lc.length).toBe(9, "length 2");
	// 			expect(lc.offset).toBe(10, "offset 2");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 3");
	// 			return lc.fetch(18, 4);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([19,20]);
	// 			expect(lc.cache).toEqual([11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(10, "length 3");
	// 			expect(lc.offset).toBe(10, "offset 3");
	// 			expect(lc.isDataEndReached).toBe(true, "isDataEndReached 3");
	// 		});
	//
	// });
	//
	// it("fills cache with partial overlap sometimes - max 20, reverse order", () => {
	//
	// 	const lc = new LinearCache(fetcherMax20, 15, 5);
	//
	// 	lc.fetch(15, 4)
	// 		.then(d => {
	// 			expect(d).toEqual([16,17,18,19]);
	// 			expect(lc.cache).toEqual([16,17,18,19,20]);
	// 			expect(lc.length).toBe(5, "length 1");
	// 			expect(lc.offset).toBe(15, "offset 1");
	// 			expect(lc.isDataEndReached).toBe(true, "isDataEndReached 1");
	// 			return lc.fetch(11, 4);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([12,13,14,15]);
	// 			expect(lc.cache).toEqual([12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(9, "length 2");
	// 			expect(lc.offset).toBe(11, "offset 2");
	// 			expect(lc.isDataEndReached).toBe(true, "isDataEndReached 2");
	// 			return lc.fetch(7, 4);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([8,9,10,11]);
	// 			expect(lc.cache).toEqual([8,9,10,11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(13, "length 3");
	// 			expect(lc.offset).toBe(7, "offset 3");
	// 			expect(lc.isDataEndReached).toBe(true, "isDataEndReached 3");
	// 		});
	//
	// });
	//
	// it("fills cache 3 times (no gap), calls in reverse order", () => {
	//
	// 	const lc = new LinearCache(fetcher, 10, 10);
	//
	// 	lc.fetch(10, 5)
	// 		.then(d => {
	// 			expect(d).toEqual([11,12,13,14,15]);
	// 			expect(lc.cache).toEqual([11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(10, "length 1");
	// 			expect(lc.offset).toBe(10, "offset 1");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 1");
	// 			return lc.fetch(5, 5);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([6,7,8,9,10]);
	// 			expect(lc.cache).toEqual([6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(15, "length 2");
	// 			expect(lc.offset).toBe(5, "offset 2");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 2");
	// 			return lc.fetch(0, 5);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([1,2,3,4,5]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(20, "length 3");
	// 			expect(lc.offset).toBe(0, "offset 3");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 3");
	// 		});
	//
	// });
	//
	// it("identifies when there is no more data to fetch", () => {
	//
	// 	const lc = new LinearCache(fetcherMax20, 0, 25);
	//
	// 	lc.fetch(0, 10)
	// 		.then(d => {
	// 			expect(d).toEqual([1,2,3,4,5,6,7,8,9,10]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(20, "length 1");
	// 			expect(lc.offset).toBe(0, "offset 1");
	// 			expect(lc.isDataEndReached).toBe(true, "isDataEndReached 1");
	// 			return lc.fetch(10, 10);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(20, "length 2");
	// 			expect(lc.offset).toBe(0, "offset 2");
	// 			expect(lc.isDataEndReached).toBe(true, "isDataEndReached 2");
	// 			return lc.fetch(20, 10);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(20, "length 3");
	// 			expect(lc.offset).toBe(0, "offset 3");
	// 			expect(lc.isDataEndReached).toBe(true, "isDataEndReached 3");
	// 		});
	//
	// });
	//
	// it("identifies when there is no more data to fetch - first call reaches data end", () => {
	//
	// 	const lc = new LinearCache(fetcherMax20, 10, 20);
	//
	// 	lc.fetch(10, 5)
	// 		.then(d => {
	// 			expect(d).toEqual([11,12,13,14,15]);
	// 			expect(lc.cache).toEqual([11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(10, "length 1");
	// 			expect(lc.offset).toBe(10, "offset 1");
	// 			expect(lc.isDataEndReached).toBe(true, "isDataEndReached 1");
	// 			return lc.fetch(15, 5);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([16,17,18,19,20]);
	// 			expect(lc.cache).toEqual([11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(10, "length 2");
	// 			expect(lc.offset).toBe(10, "offset 2");
	// 			expect(lc.isDataEndReached).toBe(true, "isDataEndReached 2");
	// 		});
	//
	// });
	//
	// it("identifies when there is no more data to fetch - reverse order", () => {
	//
	// 	const lc = new LinearCache(fetcherMax20, 10, 20);
	//
	// 	lc.fetch(10, 10)
	// 		.then(d => {
	// 			expect(d).toEqual([11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.cache).toEqual([11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(10, "length 1");
	// 			expect(lc.offset).toBe(10, "offset 1");
	// 			expect(lc.isDataEndReached).toBe(true, "isDataEndReached 1");
	// 			return lc.fetch(0, 10);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([1,2,3,4,5,6,7,8,9,10]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.length).toBe(20, "length 3");
	// 			expect(lc.offset).toBe(0, "offset 3");
	// 			expect(lc.isDataEndReached).toBe(true, "isDataEndReached 3");
	// 		});
	//
	// });
	//
	// it("fills cache and then a new data block of same size before cache", () => {
	//
	// 	const lc = new LinearCache(fetcher, 20, 20);
	//
	// 	lc.fetch(20, 20)
	// 		.then(d => {
	// 			expect(d).toEqual([21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40]);
	// 			expect(lc.cache).toEqual([21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40]);
	// 			expect(lc.length).toBe(20, "length 1");
	// 			expect(lc.offset).toBe(20, "offset 1");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 1");
	// 			return lc.fetch(0, 20);
	// 		})
	// 		.then(d => {
	// 			expect(d).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]);
	// 			expect(lc.cache).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40]);
	// 			expect(lc.length).toBe(40, "length 2");
	// 			expect(lc.offset).toBe(0, "offset 2");
	// 			expect(lc.isDataEndReached).toBe(false, "isDataEndReached 2");
	// 		});
	//
	// });

});
