# Complete language reference

This page specifies executable source syntax, not design-only proposals. `.unid` is the canonical UTF-8, semicolon-free extension. One file may contain schema, DML, and query statements; one Engine request commits the complete script atomically.

## Lexical and layout rules

- Identifiers contain ASCII letters, digits, and `_`, and cannot start with a digit.
- Type and variant names start uppercase; tables, fields, parameters, and bindings normally start lowercase.
- `#` begins a line comment. Inside strings, `#`, `|`, and commas are ordinary text.
- Tabs cannot indent source. A top-level statement ends a preceding pipeline; a blank line does not terminate a file statement.
- `{}` delimit structs, enums, record values, field sets, match branches, groups, and multiline expressions; `[]` delimit lists; `()` delimit tuples, positional payloads, calls, and precedence groups.
- Newlines separate multiline items without commas; compact inline forms use commas. The canonical formatter emits this fixed layout.
- `|` joins compact pipeline stages only. Local closures use `value -> expression` or `(value: Type) -> expression`, never paired pipes.

Source is bounded to 1 MiB, 100,000 tokens, and 64 nested type/value/expression/layout levels. Limits return `E_LIMIT`; parse failures include a source span.

## Type declarations

```text
type Point = (float, float)

struct Contact {
  email: text
  nickname: Option<text> = None
}

enum State {
  Pending
  Running {
    worker: text
    attempt: int
  }
  Failed(text, bool)
}
```

The executable language supports primitives, named records and sums, tuples, `Option<T>`, `List<T>`, and directly self-recursive named types. It does not support user generics or mutually recursive type groups.

Record defaults must be fully type-checkable literals at schema time. Insert fills omitted fields recursively from defaults. An explicitly invalid value never falls back to a default. An `Option<T>` field without a default must still be written as `None`.

## Tables, keys, and indexes

```text
table tasks: Task {
  key id
}

create index tasks (state)

create index tasks (state, -priority, id)

create unique index tasks (owner.email, external_id)
```

A table row type must be a record. Primary keys are indexable scalars such as int, text, or UUID and reject duplicates. Tables without keys may contain equal rows.

A secondary index contains 1–16 field paths; order and direction are part of its identity. The same field tuple cannot be both ordinary and unique. Uniqueness compares the complete typed tuple, including `None`. Creating a constraint scans existing rows; a conflict leaves schema, revision, and indexes unchanged.

The planner can use a continuous equality prefix plus a range on the next component. A remaining continuous sort prefix may be traversed forward or wholly reversed. Predicates after a range, a key gap, or a stage boundary remain residual filters.

## Values and production scalars

```text
{
  id: 1
  tags: ["docs", "release"]
  location: (31.2, 121.5)
  state: State::Running {worker: "w1", attempt: 2}
}
```

Records use `field: value`; duplicate, missing, and unknown fields fail. Write unit variants as `State::Pending`, record payloads as `State::Running {...}`, and positional payloads as `Pair(1, "x")`. `Some(value)`, `None`, an empty list, and a unit variant are distinct. Named types retain nominal identity; a structurally equal anonymous record cannot replace a named record.

| Type | Canonical rule |
| --- | --- |
| `uuid` | Standard typed UUID string; valid as a key |
| `bytes` | Lowercase even-length hex; no guessed base64 |
| `date` | `@YYYY-MM-DD`; no local-time or calendar arithmetic |
| `timestamp` | Must contain `Z` or a numeric offset |
| `duration` | Exact integer units such as `30seconds` |
| `Decimal<P, S>` | `decimal "19.90"`; P 1..38, S 0..P, no implicit rounding |

Temporal conversion is explicit through `date_parse`, `timestamp_parse`, and `duration_parse`. Decimal text uses `decimal_parse old P S`; precision/scale changes use `decimal_rescale old P S`, which returns `E_DECIMAL_RANGE` rather than dropping non-zero digits.

## Finite recursion

```text
enum Tree {
  Leaf(text)
  Branch {
    children: List<Tree>
  }
}
```

A recursive type must have at least one finite inhabitant. A sum needs a terminating variant; required record/tuple members must terminate; `None` and the empty list provide termination. `type Loop = Loop` fails with `E_SCHEMA` before publication.

## Parameters and atomic scripts

`$name` is bound to the AST by a prepared Rust call or versioned protocol; it is never text substitution. Missing, extra, and wire-decode failures return `E_PARAM_MISSING`, `E_PARAM_EXTRA`, and `E_PARAM_TYPE`; contextual mismatch returns `E_TYPE`.

Schema, data, and ledger effects in one request share one candidate state. If any statement fails, none are published. Once a migration ledger is non-empty, an ordinary script cannot bypass the migration runner to change schema.

## Formatting and input status

```bash
unionid fmt --file app.unid
unionid fmt --check --file app.unid
```

The parser-backed formatter emits canonical semicolon-free layout, retains precedence parentheses, and is idempotent. The REPL and editors can use the same `complete` / `incomplete` / `invalid` status instead of guessing from blank lines.
