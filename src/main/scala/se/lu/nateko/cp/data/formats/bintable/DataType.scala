package se.lu.nateko.cp.data.formats.bintable;

/*
 * LONG has been omitted intentionally as it cannot be represented exactly in Javascript
 */
enum DataType:
	case INT, FLOAT, DOUBLE, SHORT, CHAR, BYTE, STRING
