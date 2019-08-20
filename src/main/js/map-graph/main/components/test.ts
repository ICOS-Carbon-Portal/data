interface IPerson {
	firstName: string;
	lastName: string;
}

export const greeter = (person: IPerson) => {
	return "Hello, " + person.firstName + " " + person.lastName;
};
