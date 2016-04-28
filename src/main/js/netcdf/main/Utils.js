function isLengthy(any){
	return any && any.length;
}

module.exports = {

	/*
		Returns a new function that executes another if a condition is truthy.
		The condition function and the inner function are called with the same 'this' as the outer function
	*/
	doIfConditionHolds: function(conditionFunction, innerFunction){
		var self = this;

		return function(){
			if(conditionFunction.apply(self)){
				innerFunction.apply(self, arguments);
			}
		};
	},

	isLengthy: isLengthy,

	isUndefined: function(any){
		return !any && (typeof any === 'undefined');
	},

	isUndefinedOrNull: function(any){
		return any === null || !any && (typeof any === 'undefined');
	},

	propertiesAreLengthy: function(obj, props){
		return props.every(function(prop){
			return obj[prop];
		});
	}
};
