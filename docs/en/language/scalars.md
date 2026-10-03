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
| `decimal P S` | `decimal "19.90"` | precision 1..38, never implicit rounding |

Integer, float, duration, and same-type decimal operations are checked. Overflow, division by zero, or non-finite floats return `E_ARITH`. Values of the same `decimal P S` type support `+`, `-`, negation, and `sum` directly. Operations that may change scale name the result type and rounding mode explicitly; plain `*` and `/` never infer a decimal result:

```text
derive {
  fee = decimal_mul amount (decimal "0.015") 12 2 "half_even"
  share = decimal_div amount (decimal "3") 12 2 "toward_zero"
  rounded = decimal_round amount 12 0 "half_up"
}
```

`aggregate {avg_amount = decimal_avg amount 12 2 "half_even"}` averages with the same rules. Modes are `exact`, `toward_zero`, `away_from_zero`, `floor`, `ceil`, `half_up`, and `half_even`; `exact` fails when rounding would be needed. Convert legacy text with `decimal_parse` and change scale exactly with `decimal_rescale`.

`timestamp ± duration` returns a timestamp and `timestamp - timestamp` returns a duration. Dates do not consult a clock or local timezone.

Boolean expressions support comparisons, `!`, `&&`, `||`, `contains`, `length`, option helpers, and bounded `any/all`. Braces delimit multiline expressions; parentheses change precedence. Collection predicates use `value -> expression`, never paired pipes.

Indexed byte leaves are limited to 8192 octets, complete durable index keys to 64 KiB, and ordinary typed values to 16 MiB. Violations fail atomically.
