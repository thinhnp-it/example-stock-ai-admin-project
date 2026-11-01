"""Conservative SQL validation. The database account must also be read-only."""

import sqlglot
from sqlglot import exp

ALLOWED_FUNCTIONS = {
    "avg",
    "count",
    "sum",
    "min",
    "max",
    "round",
    "abs",
    "coalesce",
    "nullif",
    "lower",
    "upper",
    "length",
    "substring",
    "extract",
    "date_trunc",
    "cast",
    "try_cast",
    "row_number",
    "rank",
    "dense_rank",
}


def validate_read_query(query: str, dialect: str) -> str:
    statements = sqlglot.parse(query, read=dialect)
    if len(statements) != 1 or not isinstance(statements[0], exp.Select):
        raise ValueError("Only one SELECT query is allowed")
    statement = statements[0]
    for node in statement.walk():
        if isinstance(
            node,
            (
                exp.Insert,
                exp.Update,
                exp.Delete,
                exp.Merge,
                exp.Into,
                exp.Lock,
                exp.Command,
            ),
        ):
            raise ValueError("Mutating or locking SQL is not allowed")
        if isinstance(node, exp.Func):
            name = node.name if isinstance(node, exp.Anonymous) else node.sql_name()
            if name.lower() not in ALLOWED_FUNCTIONS:
                raise ValueError(f"SQL function is not allowed: {name}")
    return statement.sql(dialect=dialect)
