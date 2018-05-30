create table ips
(
	id             integer primary key autoincrement not null,
	ip             text not null,
	latitude       double not null,
	longitude      double not null,
	ts             date default (date('now','localtime')),
	continent_code text,
	continent_name text,
	country_code   text,
	country_name   text,
	region_code    text,
	region_name    text,
	city           text,
	zip            text,
	is_eu          integer
);

CREATE UNIQUE INDEX ips_id_uindex ON ips (id);
CREATE INDEX ip__index ON ips (ip);
CREATE INDEX ts__index ON ips (ts DESC);
