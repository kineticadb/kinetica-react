// Builds the SQL that Example App's filter box runs: a temp materialized view of origTable,
// optionally restricted by the typed WHERE expression (a trailing ';' is dropped)
export const createLayerFiltersStmt = (expression, origTable, newViewName) => {
    let _expr = expression;
    if (_expr.endsWith(';')) {
        _expr = _expr.substring(0, _expr.length - 1);
    }
    let stmt = `SELECT * FROM ${origTable}`;
    if (_expr.length > 0) {
        stmt += ' WHERE ';
    }
    if (_expr.length > 0) {
        stmt += _expr;
    }

    stmt = `create or replace temp materialized view ${newViewName} as (${stmt}) using table properties (ttl=3)`;
    return stmt;
};
