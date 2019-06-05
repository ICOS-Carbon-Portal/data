interface IPerson {
	firstName: string;
	lastName: string;
}

export const greeter = (person: IPerson) => {
	return "Hello fgfgfg, " + person.firstName + " " + person.lastName;
};
