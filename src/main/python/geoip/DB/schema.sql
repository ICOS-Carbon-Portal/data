create table ips
(
	id        integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	ip        text,
	latitude  double,
	longitude double,
	ts        date default (date('now'))
);

CREATE UNIQUE INDEX ips_id_uindex ON ips (id);
CREATE INDEX ip__index ON ips (ip);
CREATE INDEX ts__index ON ips (ts DESC);