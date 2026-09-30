create table products(
id bigint generated always as identity primary key,
name text,
single_price integer,
wholesale_price integer,
image text,
stock integer
);

create table orders(
id bigint generated always as identity primary key,
name text,
phone text,
address text,
items jsonb,
status text default 'جدید'
);

create table wholesale_requests(
id bigint generated always as identity primary key,
name text,
shop text,
phone text,
count integer
);