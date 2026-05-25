# StructOutput-15: A Practical LLM Structured Output Test Suite

**Version 1.0 — April 2026**
**Public methodology specification · Designed for reproducible, visual LLM comparison**

---

## Overview

StructOutput-15 measures how reliably LLMs can emit valid, machine-parseable **text** in real-world structured formats. Each scenario gives the model a natural-language request and asks it to produce output in a specific target format. Scoring is deterministic: the official harness checks parseability, task correctness, and output discipline with code — not with an LLM judge.

The **core suite** covers **10 text-emittable formats across 14 scored scenarios**, with escalating difficulty from clean single-format tasks to adversarial edge cases. The suite also includes **1 supplemental boundary-awareness scenario** for a non-text/binary format (BSON). That supplemental check is reported separately so the headline score remains a pure structured-text score.

---

## Design Principles

1. **Objectively scorable.** Every output is validated by a deterministic parser — not an LLM judge. It either parses or it doesn't.
2. **Real-world formats.** No exotic or academic-only formats. Every format tested is something real users actually need from local models.
3. **Escalating traps.** Easy scenarios test basic format generation. Hard scenarios introduce edge cases that break sloppy output (special characters, nested structures, empty fields).
4. **One format per scenario (with explicit exceptions).** No multi-format fusion unless the scenario is specifically testing that.
5. **Reproducible.** Every scenario specifies the exact system prompt, user message, and validation criteria. Anyone can re-run these tests.

---

## Test Environment Setup

### Reference Harness

The official reference harness is the source of truth for scoring. It MUST pin:
- Python version
- validator/parser library versions
- model inference settings
- text normalization rules
- scoring logic

The prose in this document describes the methodology. The harness implementation defines the exact leaderboard behavior.

### System Prompt (used for SO-01 to SO-14)

```
You are a helpful assistant that generates structured output.

Rules:
- Output ONLY the requested format.
- Do not add explanations, markdown fences, labels, or surrounding prose.
- Follow the exact schema or structure described in the request.
- Use proper escaping for special characters in the target format.
- Preserve required data types exactly.
- If a field has no value, use the format's standard null/empty representation.
```

### Scenario-Specific Prompt Override (SO-15 only)

For SO-15 only, append this rule to the system prompt:

```
If the requested target format is binary or not directly representable as plain text, do not hallucinate the format. Briefly explain the limitation and offer a practical text alternative.
```

### Official Answer Contract

For the **official score** (used for leaderboards and comparisons), the model's entire response is treated as the candidate artifact. The validator:

1. Normalizes line endings to `
`.
2. Trims leading/trailing whitespace.
3. Does **not** strip markdown fences, explanatory prose, labels, or wrapper text.
4. Parses the remaining content with the scenario's official validator.
5. Checks required fields, values, types, and format-specific constraints against the scenario spec.

This keeps the official score strict and reproducible.

### Optional Normalized Score (report separately)

An implementation MAY also report a secondary **normalized score** for diagnostic purposes. In normalized mode only, the harness may unwrap a single outer markdown fence pair before parsing.

Normalized score is useful for debugging, but it MUST NOT replace the official score in tables, rankings, or headline claims.

### Scoring Dimensions

Every scored scenario is evaluated on 3 axes:

| Axis | Weight | Description |
|---|---|---|
| **Parseable** | 40% | Does the raw normalized response parse under the official validator without rescue transforms? |
| **Correctness** | 35% | Are all required fields, values, types, and format-specific constraints satisfied? |
| **Discipline** | 25% | Did the model output only the requested artifact, with no prose, fences, extra wrappers, or unrequested additions? |

Per-axis scoring: ✅ = 2 points, ⚠️ = 1 point, ❌ = 0 points.

**Scenario score** = weighted sum of axis scores, normalized to 0–100.

### Validation Tools

Each format uses one canonical validator in the official harness. Avoid cross-runtime ambiguity.

| Format | Official validator |
|---|---|
| JSON | `json.loads()` (Python, pinned version) |
| CSV | `csv.reader()` (Python, pinned version) with explicit RFC-4180-style settings |
| YAML | `yaml.safe_load()` (PyYAML, pinned version) |
| XML | `xml.etree.ElementTree.fromstring()` (Python, pinned version) |
| TOML | `tomllib.loads()` (Python 3.11+) |
| Markdown Table | Deterministic GFM-table subset validator (header row, separator row, fixed cell count, exact cell content) |
| SQL | `sqlite3` execution in an in-memory database, using **SQLite as the official dialect** |
| HTML | Pinned HTML DOM parser, followed by DOM-shape checks (table, caption, thead, tbody, th/td usage) |
| ICS | `icalendar` library (Python, pinned version) + explicit required-property checks |
| Mermaid | `mermaid-cli` syntax validation (pinned version) |

### Validation Notes

- Equivalent outputs are accepted **only when the scenario explicitly says so**.
- Parser acceptance alone is not enough for a full pass; required semantic checks still apply.
- Line endings are normalized, but character content is otherwise compared literally unless the scenario says formatting is flexible.

---

## Category A: Basic Single-Format (Can it produce valid output at all?)

### SO-01: Simple JSON Object

**Difficulty:** Easy

**User message:**

> Generate a JSON object for a book with these details: title "The Great Gatsby", author "F. Scott Fitzgerald", year 1925, genre "Novel", in_print true.

**Expected output:**
```json
{"title":"The Great Gatsby","author":"F. Scott Fitzgerald","year":1925,"genre":"Novel","in_print":true}
```

**What this tests:** Basic JSON generation. Correct types: string, integer, boolean. No arrays, no nesting.

**Validation:**
- Parses as valid JSON ✓
- `year` is a number, not `"1925"` ✓
- `in_print` is boolean `true`, not `"true"` ✓
- All 5 fields present ✓

**Scoring:**

| Result | Score |
|---|---|
| Valid JSON, correct types for all fields | ✅ Full pass |
| Valid JSON but `year` is a string `"1925"` or `in_print` is `"true"` | ⚠️ Half credit on Correctness |
| Wraps in markdown fence ` ```json ` | ⚠️ Half credit on Discipline |
| Invalid JSON (trailing comma, single quotes, unquoted keys) | ❌ Fail on Parseable |

---

### SO-02: CSV with Headers

**Difficulty:** Easy

**User message:**

> Generate a CSV file with headers: name, age, city, email. Include these 3 records:
> - Alice Johnson, 32, Portland, alice@example.com
> - Bob Smith, 45, Chicago, bob@example.com
> - Carol White, 28, Austin, carol@example.com

**Expected output:**
```
name,age,city,email
Alice Johnson,32,Portland,alice@example.com
Bob Smith,45,Chicago,bob@example.com
Carol White,28,Austin,carol@example.com
```

**What this tests:** Basic CSV generation with headers. Correct delimiter, consistent row length, no quoting needed (no special characters in values).

**Validation:**
- 4 rows (1 header + 3 data) ✓
- All rows have exactly 4 fields ✓
- Header row matches expected field names ✓
- Data values match expected values ✓

**Scoring:**

| Result | Score |
|---|---|
| Valid CSV, correct headers and data | ✅ Full pass |
| Valid CSV but reordered columns | ⚠️ Half credit on Correctness |
| Uses semicolons or tabs instead of commas | ❌ Fail on Parseable (not standard CSV) |
| Adds an index/ID column not requested | ⚠️ Half credit on Discipline |

---

### SO-03: YAML Configuration

**Difficulty:** Easy

**User message:**

> Generate a YAML configuration for a web server with these settings: host "0.0.0.0", port 8080, debug false, allowed_origins is a list containing "https://example.com" and "https://app.example.com", and database has nested fields: host "localhost", port 5432, name "myapp_db".

**Expected output:**
```yaml
host: "0.0.0.0"
port: 8080
debug: false
allowed_origins:
  - "https://example.com"
  - "https://app.example.com"
database:
  host: "localhost"
  port: 5432
  name: "myapp_db"
```

**What this tests:** YAML generation with nested objects and lists. Proper indentation is critical — YAML is whitespace-sensitive.

**Validation:**
- Parses as valid YAML ✓
- `port` values are integers ✓
- `debug` is boolean ✓
- `allowed_origins` is a list with 2 items ✓
- `database` is a nested mapping with 3 keys ✓

**Scoring:**

| Result | Score |
|---|---|
| Valid YAML, correct types and nesting | ✅ Full pass |
| Valid YAML but inconsistent indentation (still parses) | ✅ Full pass on Parseable, note in results |
| Indentation error that breaks parsing | ❌ Fail on Parseable |
| Uses JSON syntax inside YAML (technically valid but not idiomatic) | ⚠️ Half credit on Discipline |

---

## Category B: Less Common Formats (Does it know more than JSON?)

### SO-04: TOML Configuration

**Difficulty:** Medium

**User message:**

> Generate a TOML configuration file for a Rust project with: package name "my_cli", version "0.1.0", edition "2021", authors list with "Alice <alice@example.com>". Dependencies section: serde version "1.0" with features ["derive"], clap version "4.5".

**Expected output:**
```toml
[package]
name = "my_cli"
version = "0.1.0"
edition = "2021"
authors = ["Alice <alice@example.com>"]

[dependencies]
clap = "4.5"

[dependencies.serde]
version = "1.0"
features = ["derive"]
```

**What this tests:** TOML-specific syntax — section headers with `[]`, inline arrays, dotted keys, and the distinction between simple `key = "value"` dependencies and dependencies with features (which require sub-tables).

**Validation:**
- Parses as valid TOML ✓
- `[package]` section has all 4 fields ✓
- `authors` is an array ✓
- `serde` dependency has `features` as an array containing `"derive"` ✓
- `clap` dependency is a simple string version ✓

**Scoring:**

| Result | Score |
|---|---|
| Valid TOML, correct sections and types | ✅ Full pass |
| Valid TOML but uses inline table for serde `{ version = "1.0", features = ["derive"] }` | ✅ Full pass — equivalent |
| Uses YAML or JSON syntax | ❌ Fail — wrong format |
| Confuses TOML section syntax (uses `:` instead of `=`) | ❌ Fail on Parseable |

---

### SO-05: SQL CREATE + INSERT

**Difficulty:** Medium

**User message:**

> Generate SQL to create a table called "employees" with columns: id (integer, primary key, auto increment), name (varchar 100, not null), department (varchar 50), salary (decimal 10,2), hire_date (date). Then insert 2 rows: "Alice Chen", "Engineering", 95000.00, "2023-06-15" and "Bob Park", "Marketing", 78500.50, "2024-01-10".

**Expected output (one valid SQLite answer):**
```sql
CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    salary DECIMAL(10,2),
    hire_date DATE
);

INSERT INTO employees (name, department, salary, hire_date) VALUES ('Alice Chen', 'Engineering', 95000.00, '2023-06-15');
INSERT INTO employees (name, department, salary, hire_date) VALUES ('Bob Park', 'Marketing', 78500.50, '2024-01-10');
```

**What this tests:** SQL DDL + DML syntax in the **official SQLite dialect**. Correct column definitions, proper string quoting, numeric precision, date representation, and omission of the auto-generated `id` column in the inserts.

**Accepted equivalents:**
- `INTEGER PRIMARY KEY AUTOINCREMENT` is accepted as equivalent to `INTEGER PRIMARY KEY` for this scenario.
- Minor whitespace/line-break differences are irrelevant.

**Validation:**
- Executes successfully in an empty in-memory SQLite database ✓
- Creates an `employees` table with the expected columns ✓
- Inserts exactly 2 rows ✓
- `id` is omitted from both INSERT statements ✓
- Name/department/date values match the prompt ✓
- Numeric values remain numeric literals ✓

**Scoring:**

| Result | Score |
|---|---|
| Valid SQLite SQL, table created, both rows inserted correctly | ✅ Full pass |
| Uses `INTEGER PRIMARY KEY AUTOINCREMENT` instead of `INTEGER PRIMARY KEY` | ✅ Full pass — accepted equivalent |
| Uses non-SQLite-only syntax that fails in the official harness | ❌ Fail on Parseable |
| Includes `id` in INSERT with explicit values | ⚠️ Half credit on Correctness — workable but violates task intent |

---

### SO-06: ICS Calendar Event

**Difficulty:** Medium

**User message:**

> Generate an ICS calendar event for a team meeting on April 15, 2026, from 2:00 PM to 3:30 PM Eastern Time. Title: "Q2 Planning Session". Location: "Conference Room B". Description: "Quarterly planning meeting - bring your project updates". Organizer: alice@company.com.

**Expected output (one valid answer):**
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//StructOutput-15//EN
BEGIN:VEVENT
UID:so06-20260415-140000@example.test
DTSTAMP:20260401T000000Z
DTSTART:20260415T180000Z
DTEND:20260415T193000Z
SUMMARY:Q2 Planning Session
LOCATION:Conference Room B
DESCRIPTION:Quarterly planning meeting - bring your project updates
ORGANIZER:mailto:alice@company.com
END:VEVENT
END:VCALENDAR
```

**What this tests:** iCalendar output that is both parseable and minimally conformant. The key requirement is the **correct event instant and duration** plus the required event/container properties.

**Accepted equivalents:**
- `DTSTART;TZID=America/New_York:20260415T140000` with an equivalent resolved instant is accepted.
- `DURATION:PT90M` may be used instead of `DTEND`.
- Field order may vary.

**Validation:**
- Parses as valid iCalendar ✓
- `VCALENDAR` includes `VERSION` and `PRODID` ✓
- `VEVENT` includes `UID` and `DTSTAMP` ✓
- Event represents the correct instant and a 90-minute duration ✓
- `SUMMARY`, `LOCATION`, `DESCRIPTION`, and `ORGANIZER` are present ✓
- Wrapped in `VCALENDAR` / `VEVENT` blocks ✓

**Scoring:**

| Result | Score |
|---|---|
| Valid ICS, required properties present, correct instant and duration | ✅ Full pass |
| Valid ICS but omits `UID` or `DTSTAMP` | ⚠️ Half credit on Correctness — parseable but not minimally conformant |
| Uses `TITLE` and omits `SUMMARY` | ❌ Fail on Correctness — missing required semantic field |
| Missing `BEGIN:VCALENDAR` wrapper | ❌ Fail on Parseable — incomplete calendar object |

---

## Category C: Complex Structures (Can it handle nesting and edge cases?)

### SO-07: Nested JSON with Arrays and Nulls

**Difficulty:** Hard

**User message:**

> Generate a JSON object representing an API response for a user profile. The user has: id 42, username "j_doe", email null (not verified yet), roles array with "editor" and "viewer", address object with street "123 Main St", city "Springfield", state "IL", zip "62704", and phone_numbers array containing two objects: one with type "mobile", number "+1-555-0123", primary true, and one with type "work", number null, primary false. Include a metadata object with last_login "2026-03-15T10:30:00Z" and login_count 847.

**Expected output (structure, formatting flexible):**
```json
{
  "id": 42,
  "username": "j_doe",
  "email": null,
  "roles": ["editor", "viewer"],
  "address": {
    "street": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zip": "62704"
  },
  "phone_numbers": [
    {"type": "mobile", "number": "+1-555-0123", "primary": true},
    {"type": "work", "number": null, "primary": false}
  ],
  "metadata": {
    "last_login": "2026-03-15T10:30:00Z",
    "login_count": 847
  }
}
```

**What this tests:** Deep nesting, arrays of objects, explicit `null` values (not empty string, not "null", not omitted), mixed types in a single object.

**Trap:** The `email` and work phone `number` must be JSON `null`, not the string `"null"` or an empty string `""`. The `zip` must be a string `"62704"`, not the integer `62704` (zip codes have leading zeros in some regions — string is correct).

**Validation:**
- Valid JSON ✓
- `email` is `null` (not `"null"` or `""`) ✓
- `phone_numbers[1].number` is `null` ✓
- `zip` is string `"62704"` ✓
- `id` and `login_count` are integers ✓
- `primary` fields are booleans ✓

**Scoring:**

| Result | Score |
|---|---|
| Valid JSON, all types correct including nulls | ✅ Full pass |
| Valid JSON but `email` is `"null"` string | ⚠️ Half credit on Correctness |
| Valid JSON but `zip` is integer `62704` | ⚠️ Half credit on Correctness |
| Multiple type errors | ❌ Fail on Correctness |

---

### SO-08: CSV with Special Characters

**Difficulty:** Hard

**User message:**

> Generate a CSV with headers: company, description, revenue, ceo. Include these 3 records:
> - Acme, Inc., "Makes everything, from anvils to rockets", $1.2B, Jane "JJ" Smith
> - O'Brien & Sons, "Family-owned since 1952", $45M, Patrick O'Brien
> - 株式会社テスト (Test Corp), "Japanese tech company", ¥500B, 田中太郎

**Expected output:**
```
company,description,revenue,ceo
"Acme, Inc.","Makes everything, from anvils to rockets","$1.2B","Jane ""JJ"" Smith"
"O'Brien & Sons","Family-owned since 1952",$45M,"Patrick O'Brien"
"株式会社テスト (Test Corp)",Japanese tech company,¥500B,田中太郎
```

**What this tests:** RFC 4180 CSV compliance with edge cases: commas inside values (must quote), double quotes inside values (must escape as `""`), apostrophes (do NOT need special treatment), and non-ASCII characters (Unicode should pass through).

**Trap:** The company "Acme, Inc." has a comma — it MUST be quoted. The CEO "Jane "JJ" Smith" has embedded double quotes — they must be escaped as `""JJ""`. The apostrophe in O'Brien does NOT need quoting (apostrophes are not special in CSV).

**Validation:**
- Parses as valid CSV with 4 rows (1 header + 3 data) ✓
- All rows have exactly 4 fields after parsing ✓
- "Acme, Inc." parsed as single field (not split at comma) ✓
- "Jane "JJ" Smith" contains literal double quotes after unescaping ✓
- Unicode characters preserved ✓

**Scoring:**

| Result | Score |
|---|---|
| Valid CSV, all special characters correctly handled | ✅ Full pass |
| Splits "Acme, Inc." across two fields | ❌ Fail on Parseable — broken CSV |
| Escapes double quotes with backslash `\"` instead of `""` | ❌ Fail on Parseable — not RFC 4180 compliant |
| Handles commas correctly but drops Unicode characters | ⚠️ Half credit on Correctness |

---

### SO-09: XML with Namespaces and Attributes

**Difficulty:** Hard

**User message:**

> Generate an XML document representing a book catalog. The root element is "catalog" with namespace "http://example.com/books" and attribute version="2.0". Include 2 books, each with attributes id and lang. Book 1: id="bk101", lang="en", title "Rust Programming", author "Steve Klabnik", price 39.99 with currency attribute "USD". Book 2: id="bk102", lang="ja", title "プログラミングRust", author "Steve Klabnik", price 4500 with currency attribute "JPY". Include an XML declaration.

**Expected output:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<catalog xmlns="http://example.com/books" version="2.0">
  <book id="bk101" lang="en">
    <title>Rust Programming</title>
    <author>Steve Klabnik</author>
    <price currency="USD">39.99</price>
  </book>
  <book id="bk102" lang="ja">
    <title>プログラミングRust</title>
    <author>Steve Klabnik</author>
    <price currency="JPY">4500</price>
  </book>
</catalog>
```

**What this tests:** XML well-formedness, namespace declaration, attributes on elements, mixed content (attributes + text), XML declaration, and Unicode in element content.

**Validation:**
- Parses as well-formed XML ✓
- Root element has correct namespace ✓
- Book elements have `id` and `lang` attributes ✓
- Price elements have `currency` attribute ✓
- Unicode characters preserved ✓

**Scoring:**

| Result | Score |
|---|---|
| Well-formed XML, correct namespace, attributes, and content | ✅ Full pass |
| Well-formed XML but missing namespace declaration | ⚠️ Half credit on Correctness |
| Missing XML declaration but otherwise correct | ✅ Full pass — XML declaration is optional |
| Unescaped special characters or missing closing tags | ❌ Fail on Parseable |

---

## Category D: Format Conversion and Multi-Format (Can it translate between formats?)

### SO-10: JSON to Markdown Table

**Difficulty:** Medium

**User message:**

> Convert this JSON array into a Markdown table:
> [{"name": "Alice", "score": 95, "grade": "A"}, {"name": "Bob", "score": 82, "grade": "B+"}, {"name": "Carol", "score": 78, "grade": "C+"}, {"name": "Dave", "score": 91, "grade": "A-"}]

**Expected output:**
```
| name  | score | grade |
|-------|-------|-------|
| Alice | 95    | A     |
| Bob   | 82    | B+    |
| Carol | 78    | C+    |
| Dave  | 91    | A-    |
```

**What this tests:** Format conversion. The model must read JSON input and produce a correctly formatted Markdown table with header separator row.

**Validation:**
- Has pipe-delimited header row ✓
- Has separator row with dashes ✓
- 4 data rows ✓
- All values match source JSON ✓
- Consistent column count across all rows ✓

**Scoring:**

| Result | Score |
|---|---|
| Correct Markdown table with all data | ✅ Full pass |
| Correct table but reordered columns | ⚠️ Half credit on Correctness |
| Missing separator row `|---|---|---|` | ❌ Fail — invalid Markdown table |
| Outputs JSON instead of Markdown table | ❌ Fail — wrong format |

---

### SO-11: Natural Language to Mermaid Diagram

**Difficulty:** Hard

**User message:**

> Generate a Mermaid flowchart for this process: User submits a form. System validates the input. If valid, save to database and send confirmation email, then show success page. If invalid, show error message and return to form.

**Expected output:**
```
flowchart TD
    A[User submits form] --> B{System validates input}
    B -->|Valid| C[Save to database]
    C --> D[Send confirmation email]
    D --> E[Show success page]
    B -->|Invalid| F[Show error message]
    F --> A
```

**What this tests:** Mermaid diagram syntax — node shapes (`[]` for process, `{}` for decision), arrow labels, and logical flow. The model must translate prose into correct Mermaid syntax.

**Validation:**
- Mermaid syntax is valid (parseable by mermaid-cli) ✓
- Contains a decision node (diamond/rhombus shape `{}`) ✓
- Has two branches from the decision ✓
- Loop back from error to form ✓

**Scoring:**

| Result | Score |
|---|---|
| Valid Mermaid with correct flow logic and node types | ✅ Full pass |
| Valid Mermaid but uses wrong node shape for decision (rectangle instead of diamond) | ⚠️ Half credit on Correctness |
| Syntax errors that prevent rendering | ❌ Fail on Parseable |
| Outputs a text description instead of Mermaid code | ❌ Fail — wrong format |

---

### SO-12: HTML Table with Semantic Markup

**Difficulty:** Medium

**User message:**

> Generate an HTML table showing quarterly revenue. Headers: Quarter, Revenue, Growth. Data: Q1 $1.2M +5%, Q2 $1.4M +16.7%, Q3 $1.1M -21.4%, Q4 $1.8M +63.6%. Use thead, tbody, and th elements properly. Add a caption "2025 Quarterly Revenue".

**Expected output:**
```html
<table>
  <caption>2025 Quarterly Revenue</caption>
  <thead>
    <tr>
      <th>Quarter</th>
      <th>Revenue</th>
      <th>Growth</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Q1</td>
      <td>$1.2M</td>
      <td>+5%</td>
    </tr>
    <tr>
      <td>Q2</td>
      <td>$1.4M</td>
      <td>+16.7%</td>
    </tr>
    <tr>
      <td>Q3</td>
      <td>$1.1M</td>
      <td>-21.4%</td>
    </tr>
    <tr>
      <td>Q4</td>
      <td>$1.8M</td>
      <td>+63.6%</td>
    </tr>
  </tbody>
</table>
```

**What this tests:** Semantic HTML — proper use of `<thead>`, `<tbody>`, `<th>` vs `<td>`, and `<caption>`. The goal is a correct table DOM, not just something that looks like a table.

**Validation:**
- Parses into a DOM under the official HTML validator ✓
- DOM contains one `<table>` element ✓
- Uses `<thead>` and `<tbody>` ✓
- Header cells use `<th>`, data cells use `<td>` ✓
- `<caption>` element present ✓
- All 4 data rows contain the correct values ✓

**Scoring:**

| Result | Score |
|---|---|
| Valid HTML fragment with correct semantic table structure | ✅ Full pass |
| Valid HTML but uses `<td>` for headers instead of `<th>` | ⚠️ Half credit on Correctness |
| Missing `<thead>/<tbody>` but otherwise correct | ⚠️ Half credit on Correctness |
| Outputs a Markdown table instead of HTML | ❌ Fail — wrong format |

---

## Category E: Adversarial Edge Cases (Can it handle traps?)

### SO-13: JSON with Tricky Values

**Difficulty:** Expert

**User message:**

> Generate a JSON object with these exact key-value pairs: empty_string should be "" (an empty string), null_value should be null, zero should be 0, false_value should be false, empty_array should be [], empty_object should be {}, special_chars should be the string containing a backslash, a double quote, a newline, and a tab: `\"\n\t`, nested_null should be an object with key "a" set to null and key "b" set to an array containing null and 1.

**Expected output:**
```json
{
  "empty_string": "",
  "null_value": null,
  "zero": 0,
  "false_value": false,
  "empty_array": [],
  "empty_object": {},
  "special_chars": "\\\"\n\t",
  "nested_null": {"a": null, "b": [null, 1]}
}
```

**What this tests:** JSON edge cases that trip up small models: the difference between `""`, `null`, `0`, `false`, `[]`, and `{}` — all falsy in various languages but distinct in JSON. Plus proper escape sequences.

**Trap:** Models commonly confuse these: outputting `"null"` instead of `null`, `"false"` instead of `false`, `"0"` instead of `0`, omitting empty containers, or failing to escape special characters properly.

**Validation:**
- Valid JSON ✓
- `empty_string` is `""` (not `null` or omitted) ✓
- `null_value` is `null` (not `"null"`) ✓
- `zero` is `0` (not `"0"` or `null`) ✓
- `false_value` is `false` (not `"false"` or `0`) ✓
- `empty_array` is `[]` (not `null`) ✓
- `empty_object` is `{}` (not `null`) ✓
- `special_chars` contains literal backslash, quote, newline, tab (properly escaped) ✓
- `nested_null.a` is `null` and `nested_null.b[0]` is `null` ✓

**Scoring:**

| Result | Score |
|---|---|
| Valid JSON, all edge cases handled correctly | ✅ Full pass |
| Valid JSON but 1–2 type confusions | ⚠️ Half credit on Correctness |
| Valid JSON but 3+ type confusions | ❌ Fail on Correctness |
| Invalid JSON (broken escape sequences) | ❌ Fail on Parseable |

---

### SO-14: CSV Adversarial — The Delimiter Minefield

**Difficulty:** Expert

**User message:**

> Generate a CSV with headers: id, description, formula, notes. Include these 2 records:
> Row 1: id 1, description is: He said "hello, world" and left, formula is: =SUM(A1,B1), notes is: Line one\nLine two (actual newline in the value)
> Row 2: id 2, description is: Simple value, formula is: =IF(A1>0,"yes","no"), notes is empty

**Expected output:**
```
id,description,formula,notes
1,"He said ""hello, world"" and left","=SUM(A1,B1)","Line one
Line two"
2,Simple value,"=IF(A1>0,""yes"",""no"")",
```

**What this tests:** Multiple CSV escaping challenges in a single scenario: embedded commas, embedded double quotes (double-escape with `""`), embedded newlines (must be inside quoted field), formula-like values, and empty trailing fields.

**Trap:** This scenario combines EVERY common CSV escaping failure: commas that split fields, quotes that break quoting, newlines that break rows, and empty values that get dropped. Small models frequently produce output that looks right visually but fails parsing.

**Validation:**
- Parses as valid CSV ✓
- Exactly 2 data rows (despite embedded newline making it look like 3 lines) ✓
- `description` field 1 contains literal comma and double quotes ✓
- `notes` field 1 contains a literal newline ✓
- `notes` field 2 is empty (not null, not omitted) ✓
- `formula` field 2 contains literal double quotes ✓

**Scoring:**

| Result | Score |
|---|---|
| Valid RFC 4180 CSV, all escaping correct | ✅ Full pass |
| Most escaping correct but embedded newline breaks row structure | ⚠️ Half credit |
| Broken quoting causes field misalignment | ❌ Fail on Parseable |
| Uses backslash escaping `\"` instead of RFC 4180 doubling `""` | ❌ Fail on Parseable |

---

### SO-15 (Supplemental): Binary Format Boundary — BSON

**Difficulty:** Medium  
**Type:** Supplemental boundary-awareness check — reported separately from the core score

**User message:**

> Generate a BSON document with fields name "Alice" and age 30.

**Expected behavior:** The model should explain that BSON is a binary format and cannot be emitted directly as a plain-text structured artifact in the same way as JSON or CSV. It should then offer a practical alternative: JSON, code that creates BSON, or a byte-oriented representation clearly labeled as non-primary.

**What this tests:** Does the model recognize the boundary between text-emittable formats and binary formats, instead of hallucinating a textual "BSON" answer?

**Scoring (supplemental only):**

| Result | Score |
|---|---|
| Explains BSON is binary and offers JSON or code as a practical alternative | ✅ Pass |
| Recognizes the limitation but gives no practical alternative | ⚠️ Partial pass |
| Outputs JSON and labels it as BSON, or invents a textual BSON format | ❌ Fail |

**Reporting rule:** SO-15 is shown in results tables, but it is **not included** in the weighted core structured-output score.

---

## Scoring Summary

### Per-Scenario Scoring

| Symbol | Meaning | Points |
|---|---|---|
| ✅ | Full pass | 2 |
| ⚠️ | Half credit | 1 |
| ❌ | Fail | 0 |

### Core Category Weights

The **core score** includes SO-01 through SO-14 only.

| Category | Tests | Focus | Weight |
|---|---|---|---|
| A — Basic Single-Format | SO-01, SO-02, SO-03 | Can it produce valid output? | 15% |
| B — Less Common Formats | SO-04, SO-05, SO-06 | Does it know more than JSON? | 20% |
| C — Complex Structures | SO-07, SO-08, SO-09 | Can it handle nesting and edge cases? | 25% |
| D — Conversion & Multi-Format | SO-10, SO-11, SO-12 | Can it translate between formats? | 20% |
| E — Adversarial Edge Cases | SO-13, SO-14 | Can it handle traps? | 20% |

### Supplemental Check

| Check | Status in final score |
|---|---|
| SO-15 — BSON boundary awareness | Report separately; excluded from weighted core score |

### Final Score Calculation

```
Category Score = (points earned / max points) × 100
Core Score     = weighted average of category scores for SO-01..SO-14
```

An implementation MAY also report:
- **Strict Core Score** — official headline score
- **Normalized Core Score** — diagnostic only
- **SO-15 Supplemental Result** — pass / partial / fail

### Rating Tiers

| Score | Rating | Meaning |
|---|---|---|
| 90–100 | ★★★★★ Excellent | Production-ready structured output |
| 75–89 | ★★★★ Good | Reliable for most formats |
| 60–74 | ★★★ Adequate | Handles common formats, struggles with edge cases |
| 40–59 | ★★ Weak | Frequent parsing failures |
| 0–39 | ★ Poor | Cannot reliably produce parseable output |


## How to Run a Comparison

### Pre-Recording Checklist

1. Use the same pinned system prompt for every model
2. Apply the SO-15 override only to SO-15
3. Present user messages with identical formatting
4. Pin inference settings: temperature, top_p, top_k/min_p (if used), repetition penalty, max tokens, stop sequences, and seed (if supported)
5. Record runtime details: model name, model version or commit, quantization, tokenizer/runtime, context window, and hardware
6. Normalize text as specified by the official answer contract only
7. Validate outputs with the pinned parser/runtime versions in the official harness
8. Record the first attempt for the headline score — no cherry-picking
9. Optionally run multiple repeats and report per-scenario pass rate for stability
10. Show the raw model output, parse result, and per-axis score on screen

### Reporting Recommendation

At minimum, publish:
- Strict Core Score
- Scenario-by-scenario breakdown
- Raw outputs
- Validator versions
- Full prompts
- Inference settings

If you want to make stability claims, include repeated-run statistics instead of relying on a single pass.

### Side-by-Side Template

```
┌─────────────── Model A ────────────────┬─────────────── Model B ────────────────┐
│ SO-08: CSV Special Characters          │ SO-08: CSV Special Characters          │
│                                        │                                        │
│ PARSE: ✅ Valid CSV                    │ PARSE: ❌ Field misalignment           │
│ CORR:  ✅ All values correct          │ CORR:  ❌ Comma split "Acme, Inc."    │
│ DISC:  ✅ Raw output only             │ DISC:  ⚠️ Wrapped in ```csv          │
│                                        │                                        │
│ Score: 100                             │ Score: 0                               │
└────────────────────────────────────────┴────────────────────────────────────────┘
```

---

## Limitations & Honesty Statement

This test suite is NOT:
- Comprehensive — 15 scenarios cannot cover all structured-output tasks
- A full schema-validation benchmark (for example: JSON Schema, XSD, or DTD conformance)
- A streaming-generation benchmark
- A large-scale document-conversion benchmark
- A substitute for repeated-run stability analysis

This test suite IS:
- A standardized, reproducible structured-output comparison framework
- Centered on text-emittable formats that local-model users commonly ask for
- Transparent in methodology — prompts, validators, and scoring rules are published
- Deterministically scored in the core suite
- Useful for side-by-side visual comparison and regression testing

## Changelog

**v1.0 (April 2026):** Initial public release with 15 scenarios across 5 categories, 10 structured-text formats, a supplemental BSON boundary-awareness check, pinned dialect and tooling rules, and clarified deterministic scoring for SQL, ICS, XML, and HTML.

---

## License

StructOutput-15 is released under the MIT License. See the repository [LICENSE](./LICENSE) file for the governing terms.
