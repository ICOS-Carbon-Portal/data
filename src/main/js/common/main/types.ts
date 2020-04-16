export type Obj<Value = string, Keys extends string | number | symbol = string> = {
	[Key in Keys]: Value
}
