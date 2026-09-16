# Scalars and expressions

| Type | Source form | Rule |
| --- | --- | --- |
| `int` | `42` | signed i64, checked arithmetic |
| `float` | `3.5` | finite f64 only |
| `bool` | `true` | comparisons and helpers produce bool |
| `text` | `"hello"` | UTF-8 |
| `uuid` | typed string | key/index capable |
| `bytes` | typed hex | lowercase, even length |
| `date` | `@2026-09-08` | no implicit local time or calendar math |
| `timestamp` | value with `Z` or offset | exact instant |
| `duration` | `30seconds` | exact integer unit |
| `Decimal<P, S>` | `decimal "19.90"` | precision 1..38, never implicit rounding |

`decimal P S` remains accepted as legacy input; the formatter emits `Decimal<P, S>`.

Integer, float, duration, and same-type decimal operations are checked. Overflow, division by zero, or non-finite floats return `E_ARITH`. Decimal currently supports addition, subtraction, negation, and sum—not multiplication, division, average, or rounding.

`timestamp ± duration` returns a timestamp and `timestamp - timestamp` returns a duration. Dates do not consult a clock or local timezone.

Boolean expressions support comparisons, `!`, `&&`, `||`, `contains`, `length`, option helpers, and bounded `any/all`. Braces delimit multiline expressions; parentheses change precedence. Collection predicates use `value -> expression`, never paired pipes.

Indexed byte leaves are limited to 8192 octets, complete durable index keys to 64 KiB, and ordinary typed values to 16 MiB. Violations fail atomically.
