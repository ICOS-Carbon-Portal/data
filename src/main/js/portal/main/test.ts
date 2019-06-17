interface IPerson {
	firstName: string;
	lastName: string;
	email: string;
}

const person: IPerson = {
	firstName: "John",
	lastName: "Wick",
	email: "j.w@badass.com"
};

export const greeter = (person: IPerson) => {
	return "Hello there, " + person.firstName + " " + person.lastName;
};

greeter(person);
