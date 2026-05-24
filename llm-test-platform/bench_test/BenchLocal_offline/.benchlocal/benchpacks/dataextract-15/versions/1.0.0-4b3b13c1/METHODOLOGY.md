# DataExtract-15: A Practical LLM Data Extraction Test Suite

**Version 1.0 — April 2026**
**Public methodology specification · Judge-free, reproducible exact-text extraction**

---

## Overview

DataExtract-15 measures how well LLMs can pull structured information from messy, real-world text. Every scenario gives the model a blob of unstructured content — an email, a receipt, a job posting, a product review — and asks it to extract specific fields into a defined structure.

The key differentiator from StructOutput-15: here the challenge is **comprehension and identification from noisy input**, not format generation. The output format is always JSON. String fields are scored as exact source text; numeric and boolean fields are limited to deterministic, rule-based coercions so the benchmark stays judge-free.

The suite covers 5 categories with 3 scenarios each, escalating from clean extraction to adversarial traps with ambiguity, contradiction, and deliberate red herrings.

This version adopts an **extract-exact** contract for string fields. If the benchmark expects a string, the correct answer must be copied from the source text rather than normalized into a nicer form.

---

## Design Principles

1. **Extraction, not generation.** Every answer must come from the source text. The model must NEVER invent, infer, translate, paraphrase, summarize, or hallucinate values not present in the input.
2. **Exact text for strings.** String fields are scored against exact source text spans (or exact subspans when the requested field is a component of a longer phrase). No typo correction, abbreviation expansion, case normalization, punctuation cleanup, or language translation is allowed.
3. **`null` is a valid answer.** If a field cannot be determined from the source text with explicit textual evidence, the correct extraction is `null`. Models that guess or infer earn zero credit on that field.
4. **Typed scalars must be deterministic.** Numeric and boolean fields are allowed only when the field schema explicitly requires them and the source text states them explicitly enough for a rule-based parser to validate. No semantic interpretation is required and no LLM judge is used.
5. **Traps are intentional.** Later scenarios include decoy data, contradictory information, and implicit fields designed to catch models that over-extract or mis-attribute.
6. **Objectively scorable.** Every atomic field has exactly one correct value (or `null`). Scoring is deterministic, code-driven, and judge-free.
7. **Real-world messiness.** Source texts mimic actual documents people paste into local LLMs: inconsistent formatting, typos, mixed languages, informal language.

---

## Test Environment Setup

### System Prompt (used for ALL scenarios)

```text
You are a data extraction assistant. The user will provide you with unstructured text and a list of fields to extract.

Rules:
- Extract ONLY information that is explicitly stated in the source text.
- For string fields, copy the exact value from the source text. You may return an exact subspan when the requested field is only one component of a longer phrase.
- Do NOT paraphrase, summarize, translate, expand abbreviations, correct typos, normalize formatting, or rewrite values.
- If a field spans multiple consecutive source lines, preserve those line breaks in the JSON string.
- If a field's value cannot be determined from explicit source text, use null.
- Do NOT infer, guess, or use background knowledge.
- Output valid JSON with the exact field names specified.
- Output ONLY the JSON object or JSON array. No explanations, no markdown fences.
- For numeric fields, output a JSON number only when the number is explicitly stated in the source text and can be copied by deterministic parsing.
- For boolean fields, output true or false only when the source text explicitly states the condition.
- If the prompt explicitly instructs you to resolve conflicts, use the final / most recent stated value. Otherwise do not resolve by inference.
- Preserve original capitalization, punctuation, wording, and language for string values.
```

### Official Answer Contract

The model's response is parsed as JSON. Each **atomic field** is compared against one canonical expected value. No alternative phrasings, translations, paraphrases, or “acceptable variants” are used in official scoring.

#### Field types

- **String**: must match the canonical expected string exactly after trimming leading/trailing whitespace only. Internal whitespace, punctuation, capitalization, diacritics, and language must match.
- **Number**: must be a JSON number, not a string. Comparison uses ±0.01 tolerance after parsing.
- **Boolean**: must be JSON `true` or `false`, not `"true"` / `"false"` / `"yes"` / `"no"`.
- **`null`**: must be JSON `null`, not the string `"null"`, not `""`, not omitted.
- **Array of scalars**: exact element comparison after applying the scalar rule to each element. Order is ignored unless the scenario explicitly says order matters.
- **Array of objects**: scored per atomic subfield after deterministic object matching using a scenario-defined anchor key.

#### Deterministic coercions allowed by the scorer

To keep the suite judge-free while still supporting typed JSON:

- Currency symbols and thousands separators may be stripped **only** when the field type is numeric.
- Unit markers may be removed **only** when the field type is numeric and the unit is already represented by the field schema.
- No coercion is allowed for string fields.
- No translation is allowed for any field.
- No semantic normalization is allowed for any field.

#### Object matching rules for arrays of objects

The following anchor keys are used in this suite:

- DE-02 `items` → anchor by `name`
- DE-07 person array → anchor by `name`
- DE-13 `line_items` → anchor by `description`
- DE-13 `discounts` → anchor by `description`

Once objects are matched by anchor key, each subfield is scored independently.

### Scoring Dimensions

Every scenario defines a set of **atomic fields**. Scalar fields count as one atomic field. For arrays of objects, each matched object contributes its own atomic subfields.

| Per-Field Score | Meaning |
|---|---|
| ✅ Correct | Value matches expected exactly under the contract above |
| ❌ Wrong | Value doesn't match, is missing, has the wrong type, or is non-null when expected `null` |

**Primary scenario score** = (correct atomic fields / total atomic fields) × 100

### Compliance Checks (reported separately)

These checks are reported separately from the primary score so the benchmark remains discriminative at the top end:

- **Valid JSON**: pass/fail. If invalid JSON, official scenario score = 0.
- **Exact top-level shape**: pass/fail (`object` vs `array` as specified by the scenario).
- **Requested fields only**: pass/fail. Extra fields do not add credit and trigger compliance failure.
- **No missing expected fields**: pass/fail. Missing fields score as wrong.

This separation keeps the benchmark judge-free and prevents bonus points from masking extraction errors.

---

## Category A: Clean Extraction (Can it pull data from well-formatted input?)

### DE-01: Business Card / Contact Info

**Difficulty:** Easy

**User message:**

> Extract the contact information from this text:
>
> Dr. Sarah Chen, Ph.D.
> Senior Research Scientist
> BioGen Therapeutics, Inc.
> 1420 Harbor Blvd, Suite 300
> San Diego, CA 92101
> Tel: (858) 555-0147
> Email: s.chen@biogentherapeutics.com
> LinkedIn: linkedin.com/in/sarahchen-phd
>
> Fields: name, title, company, address, city, state, zip, phone, email, linkedin_url

**Expected output:**
```json
{
  "name": "Dr. Sarah Chen, Ph.D.",
  "title": "Senior Research Scientist",
  "company": "BioGen Therapeutics, Inc.",
  "address": "1420 Harbor Blvd, Suite 300",
  "city": "San Diego",
  "state": "CA",
  "zip": "92101",
  "phone": "(858) 555-0147",
  "email": "s.chen@biogentherapeutics.com",
  "linkedin_url": "linkedin.com/in/sarahchen-phd"
}
```

**What this tests:** Baseline extraction from well-structured input. Every field is clearly labeled and unambiguous.

**Scoring:**

| Result | Score |
|---|---|
| All 10 fields correct | ✅ = 100 |
| Splits "1420 Harbor Blvd" and "Suite 300" into separate fields | ❌ on address — value no longer matches the requested field |
| Strips "Dr." and "Ph.D." from name | ❌ on name — modified the value |
| Normalizes phone to "8585550147" | ❌ on phone — instruction says preserve original values |

---

### DE-02: Receipt / Invoice

**Difficulty:** Easy

**User message:**

> Extract the transaction details from this receipt:
>
> URBAN BEAN COFFEE
> 847 Market Street
> San Francisco, CA 94103
> 
> Date: 03/15/2026  Time: 08:42 AM
> Cashier: Mike  Register: #3
> 
> Americano (L)          $4.75
> Oat Milk Latte (M)     $5.50
> Blueberry Muffin       $3.25
> 
> Subtotal:             $13.50
> Tax (8.625%):          $1.16
> Total:                $14.66
> 
> Visa ending 4821
> Auth: 772941
>
> Fields: store_name, store_address, date, time, items (array of {name, price}), subtotal, tax_rate, tax_amount, total, payment_method, card_last_four

**Expected output:**
```json
{
  "store_name": "URBAN BEAN COFFEE",
  "store_address": "847 Market Street\nSan Francisco, CA 94103",
  "date": "03/15/2026",
  "time": "08:42 AM",
  "items": [
    {"name": "Americano (L)", "price": 4.75},
    {"name": "Oat Milk Latte (M)", "price": 5.50},
    {"name": "Blueberry Muffin", "price": 3.25}
  ],
  "subtotal": 13.50,
  "tax_rate": "8.625%",
  "tax_amount": 1.16,
  "total": 14.66,
  "payment_method": "Visa",
  "card_last_four": "4821"
}
```

**What this tests:** Structured extraction from a receipt format. Prices must be numbers (not strings with "$"). The model must handle the items array and distinguish between subtotal, tax, and total.

**Scoring:**

| Result | Score |
|---|---|
| All 11 fields correct, items array has 3 objects | ✅ = 100 |
| Prices extracted as strings "$4.75" instead of numbers 4.75 | ❌ on numeric fields — wrong JSON type |
| Missing an item from the array | ❌ on items |
| Includes "Cashier" or "Register" as extra fields | ❌ compliance fail — extra fields not allowed |

---

### DE-03: Job Posting

**Difficulty:** Easy

**User message:**

> Extract the job details from this posting:
>
> 🚀 We're Hiring! Senior Frontend Engineer
> 
> Location: Austin, TX (Hybrid - 3 days in office)
> Team: Product Engineering
> Reports to: VP of Engineering
> 
> Compensation: $145,000 - $185,000 base + equity + benefits
> 
> About the role:
> We're looking for a senior frontend engineer to lead our design system rebuild. You'll work with React, TypeScript, and our custom component library. 3+ years of experience required.
>
> Must have: React, TypeScript, CSS-in-JS, accessibility (WCAG 2.1)
> Nice to have: GraphQL, Storybook, animation (Framer Motion)
>
> Apply at careers.example.com/senior-fe or email jobs@example.com
>
> Fields: job_title, location, work_model, team, reports_to, salary_min, salary_max, required_skills (array), preferred_skills (array), experience_years_min, apply_url, apply_email

**Expected output:**
```json
{
  "job_title": "Senior Frontend Engineer",
  "location": "Austin, TX",
  "work_model": "Hybrid",
  "team": "Product Engineering",
  "reports_to": "VP of Engineering",
  "salary_min": 145000,
  "salary_max": 185000,
  "required_skills": ["React", "TypeScript", "CSS-in-JS", "accessibility (WCAG 2.1)"],
  "preferred_skills": ["GraphQL", "Storybook", "animation (Framer Motion)"],
  "experience_years_min": 3,
  "apply_url": "careers.example.com/senior-fe",
  "apply_email": "jobs@example.com"
}
```

**What this tests:** Extracting from semi-structured text with multiple field types: strings, numbers, arrays. The model must parse salary range, distinguish required vs. preferred skills, and extract years of experience from prose ("3+ years").

**Scoring:**

| Result | Score |
|---|---|
| All 12 fields correct | ✅ = 100 |
| Salary as strings "$145,000" instead of numbers | ❌ on salary fields — wrong JSON type |
| Includes "equity" or "benefits" as separate fields | ❌ compliance fail — extra fields not allowed |
| Misses WCAG 2.1 from required skills | ❌ on required_skills |

---

## Category B: Noisy and Informal Input (Can it handle messy text?)

### DE-04: Informal Email Thread

**Difficulty:** Medium

**User message:**

> Extract the meeting details from this email thread:
>
> ---
> From: Lisa Park <lisa.p@company.com>
> To: Team-Alpha <team-alpha@company.com>
> Date: March 10, 2026, 3:47 PM
> Subject: Re: Re: sprint planning??
>
> ok so after talking to Jake, let's do Thursday instead of Wednesday. Same time tho - 10am. We can use the Maple room since Oak is booked. bring your laptops, we're gonna do live estimation this time
>
> btw the retro from last sprint is still on for Friday 2pm in Birch. don't confuse the two lol
>
> - Lisa
> ---
> From: Jake Torres <j.torres@company.com>
> To: Team-Alpha <team-alpha@company.com>
> Date: March 10, 2026, 2:15 PM
> Subject: Re: sprint planning??
>
> Wednesday doesn't work for me, can we move it? Thursday or Friday works. Also the Oak room has a broken projector so maybe book a different one.
> ---
>
> Fields: meeting_name, day, time, room, organizer_name, organizer_email, note

**Expected output:**
```json
{
  "meeting_name": "sprint planning",
  "day": "Thursday",
  "time": "10am",
  "room": "Maple",
  "organizer_name": "Lisa Park",
  "organizer_email": "lisa.p@company.com",
  "note": "bring your laptops, we're gonna do live estimation this time"
}
```

**What this tests:** Extraction from conversational, informal text. The model must: read the thread chronologically (the LATEST email has the final decision), distinguish the sprint planning meeting from the retro meeting, and extract from casual language.

**Trap:** The retro meeting (Friday 2pm, Birch room) is a decoy. The requested fields are about the sprint planning meeting. Models that mix details from both meetings fail.

**Scoring:**

| Result | Score |
|---|---|
| All 7 fields correct — Thursday, 10am, Maple room | ✅ = 100 |
| Extracts "Wednesday" instead of "Thursday" (used earlier email) | ❌ on day — didn't follow thread resolution |
| Extracts "Friday 2pm Birch" details (confused retro with sprint planning) | ❌ on multiple fields |
| Extracts Oak room (mentioned in context but not the final room) | ❌ on room |

---

### DE-05: Product Review with Embedded Specs

**Difficulty:** Medium

**User message:**

> Extract the product details and reviewer's assessment from this review:
>
> ★★★★☆
> Reviewed by: TechDad_42 on Feb 28, 2026
> Verified Purchase
>
> Bought the XR-7500 Pro noise-cancelling headphones for my daily commute. Was deciding between these and the Sony WH-1000XM5 ($348) but went with these since they were on sale for $279 (normally $329). Battery life is honestly amazing — I get about 38 hours on a single charge vs the 30 hours Sony claims. The ANC is good but not quite as good as my old Bose QC45s tbh. Sound quality is excellent for the price point. They fold flat which is great for my bag.
>
> One complaint: the app (v3.2.1) is buggy on Android 14. Crashes when trying to customize EQ. Not a dealbreaker since the default sound profile is great.
>
> Weight: 254g. Bluetooth 5.3. USB-C charging.
>
> Would I recommend? Yeah, especially at the sale price. Best value under $300 IMO.
>
> Fields: product_name, product_price_paid, product_price_original, rating_stars, reviewer_name, battery_life_hours, weight_grams, bluetooth_version, charging_type, competitor_1_name, competitor_1_price, competitor_2_name, complaint, recommendation

**Expected output:**
```json
{
  "product_name": "XR-7500 Pro",
  "product_price_paid": 279,
  "product_price_original": 329,
  "rating_stars": 4,
  "reviewer_name": "TechDad_42",
  "battery_life_hours": 38,
  "weight_grams": 254,
  "bluetooth_version": "5.3",
  "charging_type": "USB-C",
  "competitor_1_name": "Sony WH-1000XM5",
  "competitor_1_price": 348,
  "competitor_2_name": "Bose QC45s",
  "complaint": "the app (v3.2.1) is buggy on Android 14. Crashes when trying to customize EQ.",
  "recommendation": "Yeah, especially at the sale price."
}
```

**What this tests:** Extracting from an opinionated, informal product review. The model must distinguish the reviewed product's specs from competitor specs, handle two different prices (sale vs. original), identify competitors mentioned in comparison, and copy complaint / recommendation text exactly rather than paraphrasing it.

**Trap:** The Sony's 30-hour battery and $348 price belong to the competitor, NOT the reviewed product. Models that attribute "$348" or "30 hours" to the XR-7500 Pro fail.

**Scoring:**

| Result | Score |
|---|---|
| All 14 fields correct | ✅ = 100 |
| Assigns Sony's price ($348) to the reviewed product | ❌ on product_price — mis-attribution |
| Assigns Sony's battery life (30h) to the reviewed product | ❌ on battery_life — mis-attribution |
| Extracts "4 out of 5" instead of just 4 for rating | ❌ on rating_stars — wrong type/value under strict contract |
| Misses Bose QC45s as competitor_2 | ❌ on competitor_2_name |

---

### DE-06: Handwritten-Style Notes (OCR Simulation)

**Difficulty:** Medium

**User message:**

> Extract the patient visit details from these medical office notes (transcribed from handwritten):
>
> Pt: Margaret Liu    DOB: 5/12/1958
> Visit: 3-20-2026    Provider: Dr. Patel
> 
> CC: persistent cough x 3 weeks, worse at night
> no fever, no weight loss
> h/o asthma - childhood, resolved
> 
> BP 128/82  HR 76  Temp 98.4  SpO2 97%
> 
> Assessment: likely post-nasal drip r/t seasonal allergies
> Plan: fluticasone nasal spray, follow up 2 wks if no improvement
> Referral: none at this time
> 
> Rx: fluticasone propionate 50mcg, 2 sprays each nostril daily x 30 days
>
> Fields: patient_name, date_of_birth, visit_date, provider, chief_complaint, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, oxygen_saturation, assessment, medication_name, medication_dose, medication_duration, referral

**Expected output:**
```json
{
  "patient_name": "Margaret Liu",
  "date_of_birth": "5/12/1958",
  "visit_date": "3-20-2026",
  "provider": "Dr. Patel",
  "chief_complaint": "persistent cough x 3 weeks, worse at night",
  "blood_pressure_systolic": 128,
  "blood_pressure_diastolic": 82,
  "heart_rate": 76,
  "temperature": 98.4,
  "oxygen_saturation": 97,
  "assessment": "likely post-nasal drip r/t seasonal allergies",
  "medication_name": "fluticasone propionate",
  "medication_dose": "50mcg, 2 sprays each nostril daily",
  "medication_duration": "30 days",
  "referral": null
}
```

**What this tests:** Medical abbreviation parsing (CC, BP, HR, h/o, r/t, Rx, Pt) and extracting structured data from abbreviated notes without expanding abbreviations in string fields. The `referral` field is explicitly "none at this time" — the correct extraction is `null` (no referral was made).

**Trap:** The "h/o asthma — childhood, resolved" is historical context, NOT the chief complaint. Models that include asthma in the chief complaint are over-extracting.

**Scoring:**

| Result | Score |
|---|---|
| All 15 fields correct, referral is null | ✅ = 100 |
| Includes asthma in chief complaint | ❌ on chief_complaint |
| Referral is "none" (string) instead of null | ❌ on referral — should be JSON null |
| Splits blood pressure into "128/82" as single string | ❌ on BP fields — didn't split as requested |

---

## Category C: Multi-Entity Extraction (Can it keep entities straight?)

### DE-07: Multiple People in One Document

**Difficulty:** Hard

**User message:**

> Extract information about each person mentioned in this email:
>
> Hi team,
>
> Quick updates after today's meeting:
>
> — Marcus Washington (Senior Designer, NYC office) is taking over the Acme rebrand from Sarah. He'll be on-site in Chicago next week. His direct line is 212-555-0189. Contact him at m.washington@studio.com
>
> — Sarah Kim is transitioning to the Globex account effective April 1. She's relocating from Chicago to the LA office. No new phone yet — use her email sarah.k@studio.com for now.
>
> — The freelance illustrator we hired for Acme is Priya Desai. She charges $95/hour. Her portfolio is at priyadesai.com. She's based in Toronto but works US East Coast hours. Email: priya@priyadesai.com
>
> Please update your contacts accordingly.
> — Jordan
>
> Fields per person: name, role, location, email, phone, hourly_rate, note
> Extract as an array of person objects.

**Expected output:**
```json
[
  {
    "name": "Marcus Washington",
    "role": "Senior Designer",
    "location": "NYC",
    "email": "m.washington@studio.com",
    "phone": "212-555-0189",
    "hourly_rate": null,
    "note": "taking over the Acme rebrand from Sarah. He'll be on-site in Chicago next week"
  },
  {
    "name": "Sarah Kim",
    "role": null,
    "location": "LA",
    "email": "sarah.k@studio.com",
    "phone": null,
    "hourly_rate": null,
    "note": "transitioning to the Globex account effective April 1. She's relocating from Chicago to the LA office"
  },
  {
    "name": "Priya Desai",
    "role": "freelance illustrator",
    "location": "Toronto",
    "email": "priya@priyadesai.com",
    "phone": null,
    "hourly_rate": 95,
    "note": "works US East Coast hours"
  }
]
```

**What this tests:** Multi-entity extraction where the model must correctly associate attributes with the right person. Marcus's phone is NOT Sarah's phone. Sarah's location is LA (her new location), not Chicago (where she's moving FROM). Priya's rate belongs only to Priya.

**Trap:** Sarah's role is not explicitly stated in the text — she's "transitioning to" an account, but her job title isn't given. The correct extraction is `null`. Models that infer "Account Manager" or similar are hallucinating.

**Scoring:**

| Result | Score |
|---|---|
| All 3 entities with all fields correct | ✅ = 100 |
| Assigns Marcus's phone to Sarah | ❌ on both phone fields — cross-contamination |
| Sarah's location is "Chicago" instead of "LA" | ❌ — extracted the departure, not destination |
| Invents a role for Sarah | ❌ — should be null |
| Includes "Jordan" as a 4th person | ❌ compliance fail — Jordan is the sender, not a subject |

---

### DE-08: Conflicting Information

**Difficulty:** Hard

**User message:**

> Extract the event details from this text. If information conflicts, extract the MOST RECENT version.
>
> === ORIGINAL INVITE (March 1) ===
> Annual Company Picnic
> Date: Saturday, June 14
> Time: 11:00 AM – 4:00 PM
> Location: Riverside Park, Shelter B
> RSVP by May 15 to events@company.com
> Catering by Fresh Bites ($22/person)
>
> === UPDATE (March 12) ===
> Hey all — slight change of plans. We're moving the picnic to Lincoln Park (Shelter A) because Riverside is under construction. Same date and time. Also the caterer changed their pricing to $25/person.
>
> === CORRECTION (March 18) ===
> Sorry, one more update. The start time is now 11:30 AM (the park opens later than we thought). End time stays 4:00 PM. Everything else from the March 12 update still stands.
>
> Fields: event_name, date, start_time, end_time, location_park, location_shelter, rsvp_deadline, rsvp_email, catering_company, catering_price_per_person

**Expected output:**
```json
{
  "event_name": "Annual Company Picnic",
  "date": "Saturday, June 14",
  "start_time": "11:30 AM",
  "end_time": "4:00 PM",
  "location_park": "Lincoln Park",
  "location_shelter": "Shelter A",
  "rsvp_deadline": "May 15",
  "rsvp_email": "events@company.com",
  "catering_company": "Fresh Bites",
  "catering_price_per_person": 25
}
```

**What this tests:** Temporal conflict resolution. The model must track which update supersedes which. The start time changed in the March 18 correction. The location changed in the March 12 update. The catering price changed in the March 12 update. The date did NOT change (explicitly "Same date").

**Trap:** Models must not revert to original values. The most common error: extracting the original start time (11:00 AM) instead of the corrected one (11:30 AM), or extracting Riverside Park instead of Lincoln Park.

**Scoring:**

| Result | Score |
|---|---|
| All 10 fields reflect the latest information | ✅ = 100 |
| Start time is "11:00 AM" (original, not corrected) | ❌ on start_time |
| Location is "Riverside Park" (original, not updated) | ❌ on location_park |
| Price is 22 (original, not updated) | ❌ on catering_price |
| Shelter is "Shelter B" (original, not updated) | ❌ on location_shelter |

---

### DE-09: Nested Quotes — Email Within Email

**Difficulty:** Hard

**User message:**

> Extract ONLY the current (outermost) request details. Ignore quoted/forwarded content.
>
> From: Alice Wong <alice@company.com>
> To: Facilities <facilities@company.com>
> Date: March 20, 2026
> Subject: FW: Re: Conference Room Request
>
> Hi Facilities,
>
> Forwarding this thread for context, but here's what I actually need:
>
> Please book the Atlas room for 8 people on March 28, 2:00 PM–3:30 PM. We need a projector and whiteboard. No catering needed.
>
> Thanks,
> Alice
>
> -------- Forwarded Message --------
> From: Bob Chen <bob@company.com>
> Date: March 15, 2026
>
> Alice, I originally asked for the Summit room on March 22 for 12 people with lunch catering for the Q1 review. But that's been cancelled now. Can you see if Atlas is available for a smaller meeting instead?
>
> -------- Original Message --------
> From: Carol Davis <carol@company.com>
> Date: March 10, 2026
>
> Bob — the Phoenix room is booked for March 22. Try Summit or Atlas. We can do catering for up to 20 people.
>
> Fields: requester_name, requester_email, room, date, start_time, end_time, attendee_count, needs_projector, needs_whiteboard, needs_catering

**Expected output:**
```json
{
  "requester_name": "Alice Wong",
  "requester_email": "alice@company.com",
  "room": "Atlas",
  "date": "March 28",
  "start_time": "2:00 PM",
  "end_time": "3:30 PM",
  "attendee_count": 8,
  "needs_projector": true,
  "needs_whiteboard": true,
  "needs_catering": false
}
```

**What this tests:** Context layering. The email thread contains THREE different room requests from three different people at three different times. The model must extract ONLY Alice's current request (the outermost message), not Bob's cancelled request or Carol's suggestion.

**Trap:** Summit room, March 22, 12 people, lunch catering — all from Bob's cancelled request. Phoenix room is from Carol's reply. Models that extract any of these values are pulling from the wrong layer.

**Scoring:**

| Result | Score |
|---|---|
| All 10 fields from Alice's request only | ✅ = 100 |
| Room is "Summit" (from Bob's cancelled request) | ❌ on room |
| Date is "March 22" (from Bob's request) | ❌ on date |
| Attendee count is 12 (from Bob's request) | ❌ on attendee_count |
| needs_catering is true (from Bob's or Carol's message) | ❌ on needs_catering |
| Requester is "Bob Chen" (from forwarded message) | ❌ on requester fields |

---

## Category D: Implicit and Missing Data (Can it resist hallucination?)

### DE-10: The Over-Extraction Trap

**Difficulty:** Expert

**User message:**

> Extract the restaurant details from this review:
>
> "Had dinner at Sakura Sushi last night with my partner. The place is tucked away on a quiet street in what I think is the Nob Hill neighborhood — honestly not 100% sure. The omakase was incredible, maybe the best I've had in the city. We spent about 2 hours there. The chef (didn't catch his name) was super friendly. No idea what we paid — my partner handled the bill. We took an Uber home so I know it's somewhere near California Street but I really couldn't point to it on a map. Definitely going back."
>
> Fields: restaurant_name, cuisine_type, neighborhood, street_address, chef_name, price_paid, visit_duration, rating_score, reservation_required, parking_available

**Expected output:**
```json
{
  "restaurant_name": "Sakura Sushi",
  "cuisine_type": "Sushi",
  "neighborhood": null,
  "street_address": null,
  "chef_name": null,
  "price_paid": null,
  "visit_duration": "about 2 hours",
  "rating_score": null,
  "reservation_required": null,
  "parking_available": null
}
```

**What this tests:** The model's ability to return `null` for fields that are genuinely unknowable. The reviewer explicitly says they're "not 100% sure" about the neighborhood, "didn't catch" the chef's name, has "no idea" what was paid, and can't pinpoint the location. There is no rating score — just a positive sentiment.

**Trap:** This scenario is DESIGNED to have mostly null values. Models that fill in guesses fail:
- Neighborhood: reviewer says "I think Nob Hill" but also "not 100% sure" — the correct extraction is `null` because the reviewer explicitly marks it as uncertain.
- Street address: "somewhere near California Street" is not an address — it's a vague recollection. `null`.
- Chef name: "didn't catch his name" → `null`.
- Price: "no idea what we paid" → `null`.
- Rating score: no numeric rating given → `null`. ("Incredible" is sentiment, not a score.)
- Reservation/parking: not mentioned at all → `null`.

**Scoring:**

| Result | Score |
|---|---|
| Correct values for name/cuisine/duration, null for all unknowables | ✅ = 100 |
| Extracts "Nob Hill" as neighborhood (reviewer said they weren't sure) | ❌ on neighborhood |
| Extracts "California Street" as address | ❌ on street_address — it's not an address |
| Invents a rating like "5/5" or "9/10" from positive sentiment | ❌ on rating_score |
| Invents a chef name | ❌ on chef_name — hallucination |
| Returns 7+ correct null fields | Strong performance indicator |

---

### DE-11: Negation and Correction in Text

**Difficulty:** Expert

**User message:**

> Extract the final confirmed details from this planning message:
>
> "OK so for the team offsite: we were thinking Aspen but actually that's too expensive so let's do Lake Tahoe instead. Budget per person is $500, wait no, I just checked and it's $450 after the flights went up. Dates are April 10-12. Actually hold on — April 10 is a Monday and people need to fly in Sunday night, so let's do April 11-13 (Tue-Thu). We'll need 8 rooms. No wait, Jessica and Tom are sharing, and Mike can't make it anymore, so 6 rooms. The hotel is Mountain View Lodge. Or was it Mountain View Inn? Let me check... it's Mountain View Lodge. Confirmed."
>
> Fields: destination, budget_per_person, start_date, end_date, num_rooms, hotel_name, total_attendees

**Expected output:**
```json
{
  "destination": "Lake Tahoe",
  "budget_per_person": 450,
  "start_date": "April 11",
  "end_date": "April 13",
  "num_rooms": 6,
  "hotel_name": "Mountain View Lodge",
  "total_attendees": null
}
```

**What this tests:** Tracking corrections and self-corrections in stream-of-consciousness text. Every field has been revised at least once. The model must extract the FINAL stated value, not the first.

**Trap:** Every single field is a trap:
- Destination: Aspen → Lake Tahoe (corrected)
- Budget: $500 → $450 (corrected)
- Dates: April 10-12 → April 11-13 (corrected)
- Rooms: 8 → 6 (corrected with explanation)
- Hotel: Mountain View Lodge → questioned → re-confirmed as Mountain View Lodge
- Total attendees: cannot be calculated with certainty from room info alone → `null`

**Scoring:**

| Result | Score |
|---|---|
| All 7 fields match final corrected values | ✅ = 100 |
| Destination is "Aspen" (pre-correction) | ❌ |
| Budget is 500 (pre-correction) | ❌ |
| Dates are April 10-12 (pre-correction) | ❌ |
| Rooms is 8 (pre-correction) | ❌ |
| Invents total_attendees (e.g., "7" or "8") from room logic | ❌ — should be null |

---

### DE-12: Decoy Entity — Don't Extract the Wrong Thing

**Difficulty:** Expert

**User message:**

> Extract details about the PRODUCT BEING REVIEWED, not any competitors mentioned.
>
> "Bought a ZenBook Pro 15 laptop for my daughter's college. $1,299 at Best Buy. She was also considering the MacBook Air M3 ($1,099) and the Dell XPS 13 ($1,199) but we went with ASUS because of the OLED display and 16GB RAM. Battery life is about 10 hours which is less than the MacBook's 18 hours but she'll mostly use it plugged in. It's heavier than the Dell at 1.8kg vs 1.2kg but the 15-inch screen was important to her.
>
> The i7-13700H processor handles everything she throws at it. 512GB SSD is fine for now — she keeps everything in Google Drive anyway. One thing that bugs me: it came with McAfee preinstalled and a bunch of other bloatware. The ASUS customer support was also pretty bad when I called about a driver issue.
>
> Overall: 4/5 stars. Great laptop for the price, just wish ASUS cleaned up the software experience."
>
> Fields: product_name, brand, price, store, display_type, display_size, ram_gb, processor, storage, battery_life_hours, weight_kg, rating, operating_system, complaint

**Expected output:**
```json
{
  "product_name": "ZenBook Pro 15",
  "brand": "ASUS",
  "price": 1299,
  "store": "Best Buy",
  "display_type": "OLED",
  "display_size": "15-inch",
  "ram_gb": 16,
  "processor": "i7-13700H",
  "storage": "512GB SSD",
  "battery_life_hours": 10,
  "weight_kg": 1.8,
  "rating": 4,
  "operating_system": null,
  "complaint": "it came with McAfee preinstalled and a bunch of other bloatware. The ASUS customer support was also pretty bad when I called about a driver issue."
}
```

**What this tests:** Entity disambiguation. Three laptops are mentioned with their specs. The model must extract ONLY the ZenBook's details. MacBook's 18-hour battery and $1,099 price, Dell's 1.2kg weight and $1,199 price are decoys.

**Trap:** `operating_system` is never stated for the reviewed product. Models that infer "Windows" from "ASUS" or "i7 processor" are hallucinating — technically correct but not extracted from the text.

**Scoring:**

| Result | Score |
|---|---|
| All 14 fields correctly attributed to ZenBook only | ✅ = 100 |
| Battery life is 18 (MacBook's value) | ❌ — extracted competitor spec |
| Weight is 1.2 (Dell's value) | ❌ — extracted competitor spec |
| Price is 1099 or 1199 (competitor prices) | ❌ — extracted competitor spec |
| OS is "Windows" (inferred, not stated) | ❌ — should be null |

---

## Category E: Complex Real-World Documents (Full difficulty)

### DE-13: Multi-Section Invoice with Discounts

**Difficulty:** Expert

**User message:**

> Extract the invoice details:
>
> INVOICE #INV-2026-0847
> 
> From: CloudTech Solutions, LLC
> 123 Innovation Way, Seattle, WA 98101
> Tax ID: 91-7654321
> 
> Bill To: Meridian Corp
> Attn: Accounts Payable
> 500 Commerce Dr, Portland, OR 97201
> PO#: MC-2026-445
> 
> Invoice Date: March 15, 2026
> Due Date: April 14, 2026
> Terms: Net 30
>
> ┌─────────────────────────────────────────────────────────────────────┐
> │ Description                    │ Qty │ Unit Price │ Amount         │
> ├─────────────────────────────────────────────────────────────────────┤
> │ Cloud Hosting - Pro Plan       │ 12  │ $149.00    │ $1,788.00     │
> │ API Gateway - Standard         │ 1   │ $299.00    │ $299.00       │
> │ SSL Certificate - Wildcard     │ 2   │ $89.00     │ $178.00       │
> │ Professional Services (hrs)    │ 8   │ $175.00    │ $1,400.00     │
> │ Data Migration (one-time)      │ 1   │ $500.00    │ $500.00       │
> ├─────────────────────────────────────────────────────────────────────┤
> │ Subtotal                                           │ $4,165.00     │
> │ Volume Discount (10%)                              │ -$416.50      │
> │ Early Payment Credit                               │ -$50.00       │
> │ ─────────────────────────────────────────────────────────────────── │
> │ Total Due                                          │ $3,698.50     │
> └─────────────────────────────────────────────────────────────────────┘
> 
> Payment: Wire transfer to Account #****4521 (Chase Bank)
> For questions: billing@cloudtech.io
>
> Fields: invoice_number, vendor_name, vendor_address, vendor_tax_id, client_name, client_po, invoice_date, due_date, payment_terms, line_items (array of {description, qty, unit_price, amount}), subtotal, discounts (array of {description, amount}), total_due, payment_method, billing_contact_email

**Expected output:**
```json
{
  "invoice_number": "INV-2026-0847",
  "vendor_name": "CloudTech Solutions, LLC",
  "vendor_address": "123 Innovation Way, Seattle, WA 98101",
  "vendor_tax_id": "91-7654321",
  "client_name": "Meridian Corp",
  "client_po": "MC-2026-445",
  "invoice_date": "March 15, 2026",
  "due_date": "April 14, 2026",
  "payment_terms": "Net 30",
  "line_items": [
    {"description": "Cloud Hosting - Pro Plan", "qty": 12, "unit_price": 149.00, "amount": 1788.00},
    {"description": "API Gateway - Standard", "qty": 1, "unit_price": 299.00, "amount": 299.00},
    {"description": "SSL Certificate - Wildcard", "qty": 2, "unit_price": 89.00, "amount": 178.00},
    {"description": "Professional Services (hrs)", "qty": 8, "unit_price": 175.00, "amount": 1400.00},
    {"description": "Data Migration (one-time)", "qty": 1, "unit_price": 500.00, "amount": 500.00}
  ],
  "subtotal": 4165.00,
  "discounts": [
    {"description": "Volume Discount (10%)", "amount": -416.50},
    {"description": "Early Payment Credit", "amount": -50.00}
  ],
  "total_due": 3698.50,
  "payment_method": "Wire transfer",
  "billing_contact_email": "billing@cloudtech.io"
}
```

**What this tests:** Complex structured extraction with nested arrays, multiple sections, and financial data requiring exact precision.

**Scoring:**

| Result | Score |
|---|---|
| All fields correct including line items and discounts arrays | ✅ = 100 |
| Line items missing one entry | ❌ on line_items |
| Discount amounts are positive when the source shows negatives | ❌ on discount amounts — sign must match the source-derived numeric value |
| Vendor and client addresses swapped | ❌ on both address fields |
| Total doesn't match ($3,698.50) | ❌ on total_due |

---

### DE-14: Multi-Language Document

**Difficulty:** Expert

**User message:**

> Extract the product details from this bilingual product listing:
>
> 【新発売】ワイヤレスイヤホン AirPulse X3
> New Release: AirPulse X3 Wireless Earbuds
>
> 価格 / Price: ¥12,980 (税込 / tax included)
> 色 / Colors: ミッドナイトブラック (Midnight Black), パールホワイト (Pearl White), サクラピンク (Sakura Pink)
>
> 仕様 / Specifications:
> ドライバー / Driver: 10mm ダイナミック / 10mm Dynamic
> Bluetooth: 5.3
> バッテリー / Battery: イヤホン本体 8時間 / Earbuds 8 hours, ケース込み 32時間 / With case 32 hours
> 防水 / Water resistance: IPX5
> 重量 / Weight: 片耳 5.2g / Per earbud 5.2g, ケース 42g / Case 42g
> ノイキャン / ANC: ✓ アダプティブ / Adaptive
>
> 付属品 / Included: USB-C充電ケーブル, イヤーチップ(S/M/L), 取扱説明書
> Included: USB-C charging cable, ear tips (S/M/L), user manual
>
> 販売元 / Sold by: SoundWave Electronics Co., Ltd. (東京都渋谷区)
>
> Fields: product_name, product_type, price_jpy, tax_included, colors (array), driver_size, bluetooth_version, battery_life_earbuds_hours, battery_life_with_case_hours, water_resistance_rating, earbud_weight_grams, case_weight_grams, has_anc, anc_type, included_items (array), seller_name, seller_location

**Expected output:**
```json
{
  "product_name": "AirPulse X3",
  "product_type": "Wireless Earbuds",
  "price_jpy": 12980,
  "tax_included": true,
  "colors": ["Midnight Black", "Pearl White", "Sakura Pink"],
  "driver_size": "10mm",
  "bluetooth_version": "5.3",
  "battery_life_earbuds_hours": 8,
  "battery_life_with_case_hours": 32,
  "water_resistance_rating": "IPX5",
  "earbud_weight_grams": 5.2,
  "case_weight_grams": 42,
  "has_anc": true,
  "anc_type": "Adaptive",
  "included_items": ["USB-C charging cable", "ear tips (S/M/L)", "user manual"],
  "seller_name": "SoundWave Electronics Co., Ltd.",
  "seller_location": "東京都渋谷区"
}
```

**What this tests:** Extraction from bilingual content (Japanese/English). The model must handle Japanese yen formatting, bilingual labels, CJK characters, and preserve source-language strings exactly when a field is returned as text.

**Scoring:**

| Result | Score |
|---|---|
| All 17 fields correct | ✅ = 100 |
| Colors in Japanese instead of English | ❌ on colors — no translation or bilingual substitution in official scoring |
| Price as string "¥12,980" instead of number 12980 | ❌ on price_jpy — wrong JSON type |
| Seller location translated to English | ❌ on seller_location — no translation allowed |
| Missing a color from the array | ❌ on colors |

---

### DE-15: The Empty Document Trap

**Difficulty:** Medium
**Type:** Trap — most fields are genuinely unextractable

**User message:**

> Extract the company details from this "About Us" page:
>
> Welcome to our website! We're passionate about what we do and we've been doing it for a long time. Our team of dedicated professionals works hard every day to deliver the best results for our clients. We believe in innovation, integrity, and excellence.
>
> "Great service!" — A happy customer
> "Would recommend!" — Another satisfied client
>
> Contact us today to learn how we can help your business grow!
> © 2026 All rights reserved.
>
> Fields: company_name, founding_year, ceo_name, employee_count, headquarters_city, industry, annual_revenue, phone_number, email, website_url

**Expected output:**
```json
{
  "company_name": null,
  "founding_year": null,
  "ceo_name": null,
  "employee_count": null,
  "headquarters_city": null,
  "industry": null,
  "annual_revenue": null,
  "phone_number": null,
  "email": null,
  "website_url": null
}
```

**What this tests:** The model's ability to say "I don't know" when the text contains ZERO extractable information. This generic "About Us" page has no specific details whatsoever — no company name, no location, no contact info, nothing. Every field should be `null`.

**Trap:** Models hate returning all-null results. They commonly infer or hallucinate:
- Company name from generic phrases
- Industry from vague descriptions
- Year from the copyright notice (© 2026 is the current year, not necessarily the founding year)
- Contact info that doesn't exist

The copyright "© 2026" is especially tempting — models often extract it as `founding_year`. But the copyright year is the publication year, not the founding year.

**Scoring:**

| Result | Score |
|---|---|
| All 10 fields are null | ✅ = 100 |
| Extracts 2026 as founding_year (from copyright) | ❌ — copyright ≠ founding year |
| Invents a company name from the page content | ❌ — hallucination |
| Invents an industry like "consulting" | ❌ — hallucination |
| Returns 8+ correct null fields | Strong performance indicator |

---

## Scoring Summary

### Per-Scenario Scoring

**Scenario score** = (correct atomic fields / total atomic fields) × 100

Compliance is reported separately:
- Valid JSON output: pass/fail. Invalid JSON receives a scenario score of 0.
- Exact top-level shape: pass/fail.
- Requested fields only: pass/fail.
- No missing expected fields: pass/fail.

This keeps the primary score purely about extraction accuracy.

### Category Weights

| Category | Tests | Focus | Weight |
|---|---|---|---|
| A — Clean Extraction | DE-01, DE-02, DE-03 | Baseline extraction from clear input | 15% |
| B — Noisy and Informal | DE-04, DE-05, DE-06 | Messy, real-world text | 20% |
| C — Multi-Entity | DE-07, DE-08, DE-09 | Keeping entities straight | 25% |
| D — Implicit and Missing | DE-10, DE-11, DE-12 | Resisting hallucination | 25% |
| E — Complex Documents | DE-13, DE-14, DE-15 | Full difficulty real-world | 15% |

### Final Score Calculation

```
Category Score = average of scenario scores in that category
Final Score    = weighted average of all 5 category scores
```

### Rating Tiers

| Score | Rating | Meaning |
|---|---|---|
| 90–100 | ★★★★★ Excellent | Extracts accurately from any source, resists hallucination |
| 75–89 | ★★★★ Good | Reliable extraction, occasional mis-attribution |
| 60–74 | ★★★ Adequate | Handles clean inputs, struggles with ambiguity |
| 40–59 | ★★ Weak | Frequent hallucination or mis-attribution |
| 0–39 | ★ Poor | Cannot reliably extract structured data |

---

## How to Run a Comparison

### Pre-Recording Checklist

1. Use the SAME system prompt for every model (copy from above)
2. Present source texts with IDENTICAL formatting (copy-paste, no retyping)
3. Use temperature 0 and a fixed seed where supported
4. Lock all decoding settings: top_p, top_k, min_p, repetition penalty, max tokens, stop sequences
5. Use the same prompt wrapper / chat template when possible; otherwise record the exact wrapper used
6. Record the first attempt only — no retries, no cherry-picking
7. Do NOT repair invalid JSON in official scoring
8. Validate JSON output before field comparison
9. Score atomic fields independently — show per-field results on screen
10. Note the model version, runtime, quantization, seed, context length, API/runtime date, and all settings used

### Side-by-Side Template

```
┌─────────────── Model A ────────────────┬─────────────── Model B ────────────────┐
│ DE-10: Over-Extraction Trap            │ DE-10: Over-Extraction Trap            │
│                                        │                                        │
│ restaurant_name: ✅ Sakura Sushi      │ restaurant_name: ✅ Sakura Sushi      │
│ cuisine_type:    ✅ Sushi             │ cuisine_type:    ✅ Sushi             │
│ neighborhood:    ✅ null              │ neighborhood:    ❌ "Nob Hill"        │
│ street_address:  ✅ null              │ street_address:  ❌ "California St"   │
│ chef_name:       ✅ null              │ chef_name:       ❌ "Chef Tanaka"     │
│ price_paid:      ✅ null              │ price_paid:      ✅ null              │
│ visit_duration:  ✅ "about 2 hours"   │ visit_duration:  ❌ "2 hours"         │
│ rating_score:    ✅ null              │ rating_score:    ❌ "5/5"             │
│ reservation:     ✅ null              │ reservation:     ✅ null              │
│ parking:         ✅ null              │ parking:         ✅ null              │
│                                        │                                        │
│ Score: 100                             │ Score: 40                              │
└────────────────────────────────────────┴────────────────────────────────────────┘
```

---

## Limitations & Honesty Statement

This test suite is NOT:
- Testing OCR or image-to-text extraction (all input is provided as text)
- Testing extraction from extremely long documents (all inputs fit in a single prompt)
- Comprehensive — 15 scenarios cannot cover all extraction patterns
- Testing multi-document cross-referencing
- Statistically rigorous without multiple runs per scenario

This test suite IS:
- A standardized, reproducible data extraction comparison framework
- Designed for visual demonstration in screencast format
- Covering the extraction patterns that matter most for real-world local model use
- Transparent in methodology — all source texts, expected outputs, and field-level scoring are published
- Objectively scored with per-field comparison — no LLM judge needed

---

## Changelog

**v1.0 (April 2026):** Initial public release with 15 scenarios across 5 categories, an exact-text extraction contract for string fields, deterministic numeric and boolean coercions, and reproducible scoring guidance.

---

## License

DataExtract-15 is released under the MIT License. See the repository [LICENSE](./LICENSE) file for the governing terms.
