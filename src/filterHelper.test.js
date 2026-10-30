import { createLayerFiltersStmt } from './filterHelper';

test('wraps the WHERE expression in a temp materialized view', () => {
    expect(createLayerFiltersStmt('passenger_count > 5', 'demo.nyctaxi', 'demo.nyctaxi_temp_1')).toBe(
        'create or replace temp materialized view demo.nyctaxi_temp_1 as (SELECT * FROM demo.nyctaxi WHERE passenger_count > 5) using table properties (ttl=3)'
    );
});

test('drops a trailing semicolon from the expression', () => {
    expect(createLayerFiltersStmt("payment_type = 'Cash';", 'demo.nyctaxi', 'v')).toBe(
        "create or replace temp materialized view v as (SELECT * FROM demo.nyctaxi WHERE payment_type = 'Cash') using table properties (ttl=3)"
    );
});

test('selects the whole table when the expression is empty', () => {
    expect(createLayerFiltersStmt('', 'demo.nyctaxi', 'v')).toBe(
        'create or replace temp materialized view v as (SELECT * FROM demo.nyctaxi) using table properties (ttl=3)'
    );
});
