# ReasonMath-15: A Practical LLM Reasoning & Math Test Suite

**Version 1.0 — April 2026**  
**Public methodology specification · Designed for reproducible, machine-checkable local-model evaluation**

---

## Overview

ReasonMath-15 measures how well LLMs handle practical logic and math reasoning: the kinds of questions a normal user might ask a local AI assistant. These are **not** academic contest problems. They are everyday tasks such as splitting a bill, converting units, handling schedules, solving word problems, and resisting common reasoning traps.

Every scenario has:
- a fixed user prompt
- an explicit answer schema
- a deterministic answer checker
- a deterministic visible-work checker
- a published canonical solution

No LLM judge is required.

The suite contains **15 scenarios across 5 categories**, moving from straightforward arithmetic to adversarial trick cases that expose shallow pattern matching.

---

## Design Principles

1. **Machine-checkable outputs.** The benchmark scores explicit final answers and visible intermediate work using deterministic rules.
2. **Practical, not academic.** Problems should resemble realistic user questions, not olympiad-style math.
3. **Visible work, not essay-style chain-of-thought.** Models should show concise, checkable steps: equations, short statements, or numbered calculations.
4. **Reproducible across local stacks.** The methodology specifies prompt format, parser rules, scoring rules, and run protocol.
5. **Published keys and failure modes.** Every scenario documents the target answer, checkpoints, and common mistakes.

---

## Test Environment Setup

### System Prompt (used for all scenarios)

```text
You are a helpful assistant that solves practical reasoning problems.

Rules:
- Show concise visible work using equations, short bullet points, or numbered steps.
- Do not write a long essay.
- End with exactly one line that starts with "ANSWER: ".
- If the question asks for more than one value, format the final line as semicolon-separated key=value pairs.
- Use exact arithmetic when possible.
- Round only the final result when the problem context requires it.
- If the constraints are inconsistent, say so explicitly in the final answer.
```

### Official Output Contract

The reference parser extracts the **last** line that starts with `ANSWER: `.

Rules:
- The `ANSWER:` line is the only line used for answer scoring.
- For multi-part answers, fields are parsed as `key=value; key=value`.
- Keys must match the scenario schema.
- Currency values are normalized by removing commas; a leading `$` is optional in parser normalization, but canonical outputs include it.
- Fractions, decimals, and percentages may be normalized to the same numeric value where the scenario explicitly allows it.
- Units are checked only when the scenario requires them.
- If the `ANSWER:` line is missing, malformed, or ambiguous, the answer axis receives 0.

### Deterministic Scoring Dimensions

Each scenario is scored on 2 axes:

| Axis | Weight | Description |
|---|---:|---|
| **Answer Accuracy** | 70% | Does the `ANSWER:` line match the scenario's canonical answer or accepted answer set? |
| **Checkable Work Trace** | 30% | Does the response contain the published checkpoint values or logically equivalent short steps without contradiction? |

Per-axis scoring:

| Symbol | Meaning | Points |
|---|---|---:|
| ✅ | Full pass | 2 |
| ⚠️ | Partial pass | 1 |
| ❌ | Fail | 0 |

### Answer Axis Rules

- **✅ (2 points):** Correct final answer under the scenario's parser rules.
- **⚠️ (1 point):** Scenario-defined partial answer. Example: correct numeric value but wrong requested unit.
- **❌ (0 points):** Incorrect, missing, or ambiguous answer.

### Work-Trace Axis Rules

The reference implementation stores per-scenario checkpoint patterns. This document gives the human-readable checkpoint list.

- **✅ (2 points):** Response matches all required checkpoint patterns for that scenario, or an equivalent pattern set explicitly defined in the checker, and does not contradict its own final answer.
- **⚠️ (1 point):** Response matches at least one required checkpoint pattern, but not the full required set, and does not contradict its own final answer.
- **❌ (0 points):** Response matches none of the required checkpoint patterns, or the shown work contradicts the final answer, or the work is based on the wrong interpretation of the prompt.

### Scenario Score Formula

```text
Scenario Score = 100 × (0.70 × AnswerPoints/2 + 0.30 × TracePoints/2)
```

### Reference Scenario Schema

Each scenario should be represented in code with a structure equivalent to:

```json
{
  "id": "RM-01",
  "category": "A",
  "difficulty": "Easy",
  "prompt": "...",
  "answer_schema": {"per_person": "money"},
  "canonical_answer": {"per_person": 35.98},
  "accepted_answers": [],
  "answer_tolerance": 0.01,
  "trace_checkpoints": ["tax=7.14", "tip=16.80", "total=107.94", "per_person=35.98"],
  "partial_answer_rules": [],
  "notes": "Money rounded only at final step."
}
```

---

## Category A: Everyday Arithmetic

### RM-01: Bill Splitting with Tax and Tip

**Difficulty:** Easy

**User message:**

> Three friends had dinner. The food total was $84.00 before tax. Tax is 8.5%. They want to leave a 20% tip calculated on the pre-tax amount. How much does each person owe in total?

**Answer schema:** `per_person=<money>`  
**Canonical final line:** `ANSWER: per_person=$35.98`

**Trace checkpoints:**
1. `tax=7.14`
2. `tip=16.80`
3. `total=107.94`
4. `per_person=35.98`

**What this tests:** Multi-step arithmetic with percentages.  
**Common failure mode:** Calculating tip on the post-tax total instead of the pre-tax amount.

---

### RM-02: Unit Conversion Chain

**Difficulty:** Easy

**User message:**

> A recipe calls for 2.5 cups of flour. I only have a kitchen scale. If 1 cup of flour weighs approximately 125 grams, how many kilograms of flour do I need?

**Answer schema:** `kg=<number>`  
**Canonical final line:** `ANSWER: kg=0.3125`

**Accepted final answers:** `kg=0.313`  
**Scenario-specific partial answer rule:** `grams=312.5` earns ⚠️ on the answer axis because the value is right but the requested final unit is wrong.

**Trace checkpoints:**
1. `grams=312.5`
2. `kg=0.3125`

**What this tests:** Two-step unit conversion.  
**Common failure mode:** Stopping at grams instead of converting to kilograms.

---

### RM-03: Percentage Change — Not What You Think

**Difficulty:** Easy

**User message:**

> A shirt was originally $80. It went on sale for 25% off. After you bought it on sale, the store raised the original price by 25%. What is the new original price, and did you save money compared to the new price?
>
> Return the final line exactly in this format:
> `ANSWER: new_original_price=<money>; saved_money=<yes|no>`

**Answer schema:** `new_original_price=<money>; saved_money=<yes|no>`  
**Canonical final line:** `ANSWER: new_original_price=$100.00; saved_money=yes`

**Trace checkpoints:**
1. `sale_price=60`
2. `new_original_price=100`
3. `saved_money=yes`

**What this tests:** Percentage increase and decrease are not symmetric.  
**Common failure mode:** Claiming the price goes "back to $80."

---

## Category B: Logic Puzzles

### RM-04: Constraint Consistency Check

**Difficulty:** Medium  
**Scenario status:** Intentionally unsatisfiable

**User message:**

> There are 5 houses in a row. Each house is painted a different color: red, blue, green, yellow, white. Given these clues:
> 1. The red house is immediately to the left of the blue house.
> 2. The green house is in the middle (position 3).
> 3. The yellow house is not next to the green house.
> 4. The white house is at one of the ends (position 1 or 5).
>
> What is the order of the houses from left to right?

**Answer schema:** `status=<text>`  
**Canonical final line:** `ANSWER: status=unsat`

**Accepted final answers:** `status=no valid arrangement`, `status=no solution`

**Trace checkpoints:**
1. `green=3`
2. `yellow not in {2,4}`
3. `red-blue` can only be `(1,2)` or `(4,5)`
4. Case `(1,2)` leads to contradiction
5. Case `(4,5)` leads to contradiction

**What this tests:** Whether the model can detect contradictory constraints instead of forcing a fake solution.  
**Common failure mode:** Producing an arrangement that violates one of the clues.

---

### RM-05: Scheduling Conflict Resolution

**Difficulty:** Medium

**User message:**

> I need to schedule 4 meetings today. Each meeting is 45 minutes long with 15 minutes of buffer between meetings. My available time starts at 9:00 AM and ends at 1:00 PM. I also have a fixed lunch break from 12:00 PM to 12:30 PM that cannot be moved.
>
> Can I fit all 4 meetings? If yes, what are the time slots? If no, how many can I fit?
>
> Return the final line exactly in this format:
> `ANSWER: fit=<yes|no>; max_meetings=<integer>`
>
> Do not include the slots in the final `ANSWER:` line.

**Answer schema:** `fit=<yes|no>; max_meetings=<integer>`  
**Canonical final line:** `ANSWER: fit=no; max_meetings=3`

**Trace checkpoints:**
1. `window_minutes=240`
2. `lunch_minutes=30`
3. `usable_minutes=210`
4. `needed_for_4=225`
5. valid conclusion: only 3 meetings fit

**What this tests:** Scheduling with fixed blocks and buffer constraints.  
**Common failure mode:** Scheduling the fourth meeting past 1:00 PM.

---

### RM-06: Monty Hall Variant with Explicit Host Rule

**Difficulty:** Medium

**User message:**

> You're on a game show with 4 doors. Behind one door is a car. Behind the other 3 doors are goats. You pick Door 1.
>
> The host knows where the car is. The host always opens exactly 2 goat doors among the 3 doors you did not choose, leaving exactly 1 unopened alternative door besides your original choice. If the host has more than one valid pair of goat doors to open, the host chooses uniformly at random among those valid pairs.
>
> In this run, the host opens Door 3 and Door 4, both goats, and offers you the chance to switch to Door 2.
>
> What is the probability of winning the car if you switch to Door 2? What if you stay with Door 1?

**Answer schema:** `switch=<percent>; stay=<percent>`  
**Canonical final line:** `ANSWER: switch=75%; stay=25%`

**Accepted final answers:** `switch=3/4; stay=1/4`

**Trace checkpoints:**
1. `P(door1)=1/4`
2. `P(not door1)=3/4`
3. Host rule is conditional, not random over all doors
4. Under the stated host rule, `P(door2 | host opens 3 and 4)=3/4`

**What this tests:** Conditional probability under a fully specified host policy.  
**Common failure mode:** Answering `2/3` from the classic 3-door version, or `50/50` from naive symmetry.

---

## Category C: Multi-Step Word Problems

### RM-07: Speed, Distance, Time with a Twist

**Difficulty:** Hard

**User message:**

> Alice drives from City A to City B at 60 km/h. The trip takes 3 hours. She then drives back from City B to City A, but hits traffic and averages only 40 km/h on the return.
>
> What is her average speed for the entire round trip?

**Answer schema:** `avg_speed=<number>`  
**Canonical final line:** `ANSWER: avg_speed=48 km/h`

**Trace checkpoints:**
1. `distance_one_way=180`
2. `return_time=4.5`
3. `total_distance=360`
4. `total_time=7.5`
5. `avg_speed=48`

**What this tests:** Average speed is total distance divided by total time, not the arithmetic mean of the two speeds.  
**Common failure mode:** Answering `50 km/h`.

---

### RM-08: Rate and Proportion Problem

**Difficulty:** Hard

**User message:**

> A bathtub has two faucets. Faucet A alone fills the tub in 12 minutes. Faucet B alone fills it in 18 minutes. There's also a drain that empties the full tub in 36 minutes. If both faucets are open and the drain is open, how long does it take to fill the tub?
>
> Return the final line exactly in this format:
> `ANSWER: fill_time=<number> minutes`

**Answer schema:** `fill_time=<number>`  
**Canonical final line:** `ANSWER: fill_time=9 minutes`

**Trace checkpoints:**
1. `faucet a=1/12`
2. `faucet b=1/18`
3. `drain=-1/36`
4. `net rate=1/9`
5. `fill_time=9`

**What this tests:** Combined work-rate reasoning.  
**Common failure mode:** Ignoring the drain or adding times directly.

---

### RM-09: Age Problem with Temporal Reasoning

**Difficulty:** Hard

**User message:**

> Five years ago, Maria was 3 times as old as her son. In 5 years from now, Maria will be twice as old as her son. How old is Maria now?

**Answer schema:** `maria=<integer>`  
**Canonical final line:** `ANSWER: maria=35`

**Trace checkpoints:**
1. `M-5=3(S-5)`
2. `M+5=2(S+5)`
3. `S=15`
4. `M=35`

**What this tests:** Setting up and solving two time-shifted age relations.  
**Common failure mode:** Treating the ratios as if they apply to current ages directly.

---

## Category D: Trick Questions and Traps

### RM-10: The Classic Bat and Ball — Extended

**Difficulty:** Expert

**User message:**

> A bat and a ball cost $1.10 together. The bat costs $1.00 more than the ball. A glove costs twice as much as the bat. How much does the glove cost?

**Answer schema:** `glove=<money>`  
**Canonical final line:** `ANSWER: glove=$2.10`

**Trace checkpoints:**
1. `ball=0.05`
2. `bat=1.05`
3. `glove=2.10`

**What this tests:** Avoiding the famous bat-and-ball intuition error and carrying the result one step further.  
**Common failure mode:** Ball = `$0.10`, bat = `$1.00`, glove = `$2.00`.

---

### RM-11: The Lily Pad Problem — Backward Reasoning

**Difficulty:** Expert

**User message:**

> A lake has lily pads growing on it. The area covered by lily pads doubles every day. On day 30, the entire lake is covered. On what day was the lake half covered?
>
> Return the final line exactly in this format:
> `ANSWER: day=<integer>`

**Answer schema:** `day=<integer>`  
**Canonical final line:** `ANSWER: day=29`

**Trace checkpoints:**
1. `doubles every day`
2. `day 30=full`
3. `day 29=half`

**What this tests:** Backward reasoning under exponential growth.  
**Common failure mode:** Answering `15`.

---

### RM-12: Family-Relation Riddle

**Difficulty:** Medium

**User message:**

> A man points to a photograph and says, "Brothers and sisters I have none, but that man's father is my father's son." Who is in the photograph?
>
> Use the relationship from the speaker's point of view.
> Return the final line exactly in this format:
> `ANSWER: person=<relationship>`

**Answer schema:** `person=<text>`  
**Canonical final line:** `ANSWER: person=his son`

**Accepted final answers:** `person=my son`, `person=the speaker's son`, `person=son`

**Trace checkpoints:**
1. `my father's son=me`
2. `that man's father=me`
3. `person=son`

**What this tests:** Relation logic and pronoun resolution without relying on social stereotypes or open-ended interpretations.  
**Common failure mode:** Answering `himself`.

---

## Category E: Applied Reasoning

### RM-13: Compound Interest Calculation

**Difficulty:** Medium

**User message:**

> I invest $5,000 in a savings account that earns 4.5% annual interest, compounded monthly. How much will I have after 3 years? What is the total interest earned?
>
> Return the final line exactly in this format:
> `ANSWER: amount=<money>; interest=<money>`

**Answer schema:** `amount=<money>; interest=<money>`  
**Canonical final line:** `ANSWER: amount=$5721.24; interest=$721.24`

**Accepted final answers:** `amount=5721.24; interest=721.24`, `amount=$5,721.24; interest=$721.24`

**Trace checkpoints:**
1. `A=P(1+r/n)^(nt)`
2. `P=5000`, `r=0.045`, `n=12`, `t=3`
3. `(1+0.045/12)^36`
4. `amount=5721.24`
5. `interest=721.24`

**What this tests:** Applying compound interest correctly rather than using simple interest.  
**Common failure mode:** Using `5000 × (1 + 0.045 × 3)`.

---

### RM-14: Conversion with Multiple Systems

**Difficulty:** Hard

**User message:**

> A European recipe says to bake at 180°C for 45 minutes in a regular oven. I have a convection oven and I'm in the US. What temperature should I set in Fahrenheit, and for how long? Convection ovens should be set 25°F lower than the regular-oven equivalent, and baking time should be reduced by about 25%.
>
> Round the baking time to the nearest whole minute.
> Return the final line exactly in this format:
> `ANSWER: temp_f=<integer>; time_min=<integer>`

**Answer schema:** `temp_f=<number>; time_min=<number>`  
**Canonical final line:** `ANSWER: temp_f=331; time_min=34`

**Accepted final answers:** `temp_f=330; time_min=34`

**Trace checkpoints:**
1. `180c=356f`
2. `356-25=331`
3. `45*0.75=33.75`
4. `time=34`

**What this tests:** Chaining temperature conversion, convection adjustment, and time reduction.  
**Common failure mode:** Forgetting either the convection temperature adjustment or the time reduction.

---

### RM-15: Combinatorial Reasoning — PIN Possibilities

**Difficulty:** Expert

**User message:**

> A website requires a 4-digit PIN, where each digit is 0–9. How many possible PINs are there if:
> 1. All 4 digits must be different
> 2. The PIN must start with a non-zero digit
> 3. The digits must be in strictly increasing order
>
> Return the final line exactly in this format:
> `ANSWER: count=<integer>`

**Answer schema:** `count=<integer>`  
**Canonical final line:** `ANSWER: count=126`

**Trace checkpoints:**
1. `one arrangement per set`
2. `0` cannot be included because it would be the smallest digit and would force a leading zero
3. `choose 4 digits from 9`
4. `126`

**What this tests:** Recognizing that the order constraint reduces the problem from permutations to combinations.  
**Common failure mode:** Using `10 × 9 × 8 × 7` or `C(10,4)`.

---

## Scoring Summary

### Category Weights

| Category | Scenarios | Focus | Weight |
|---|---|---|---:|
| A — Everyday Arithmetic | RM-01 to RM-03 | Practical multi-step arithmetic | 15% |
| B — Logic Puzzles | RM-04 to RM-06 | Constraint satisfaction and probability | 25% |
| C — Multi-Step Word Problems | RM-07 to RM-09 | Chaining calculations | 20% |
| D — Trick Questions and Traps | RM-10 to RM-12 | Trap resistance and relation logic | 25% |
| E — Applied Reasoning | RM-13 to RM-15 | Real-world calculation and combinatorics | 15% |

### Final Score Calculation

```text
Category Score = average of scenario scores in that category
Final Score    = weighted average of all 5 category scores
```

### Rating Tiers

| Score | Rating | Meaning |
|---:|---|---|
| 90–100 | ★★★★★ Excellent | Strong practical reasoning with high consistency |
| 75–89 | ★★★★ Good | Handles most real-world reasoning tasks |
| 60–74 | ★★★ Adequate | Gets easier items right, misses traps or multi-step logic |
| 40–59 | ★★ Weak | Frequent reasoning errors |
| 0–39 | ★ Poor | Unreliable on basic reasoning tasks |

---

## Run Protocol

### Required Controls

1. Use the **same system prompt** for every model.
2. Use the **exact same user prompt text** for every scenario.
3. Run each scenario in a **fresh chat/session** with no carry-over context.
4. Use **temperature = 0**.
5. Fix all other sampling parameters where supported: `top_p`, `top_k`, repetition penalty, max new tokens, stop tokens, and seed.
6. Record the **exact model identifier**, quantization, runtime/backend, tokenizer/chat template, context length, and hardware.
7. Do not edit or retry a failed answer inside the same scored run.
8. Extract and score only the final `ANSWER:` line for the answer axis.

### Two Reporting Modes

#### Demo Mode
- 1 cold run per scenario
- first attempt only
- intended for videos, screenshots, or side-by-side visual comparisons

#### Report Mode
- 3 cold runs per scenario
- identical settings for all runs
- report:
  - mean final score
  - per-scenario answer agreement rate
  - standard deviation or score range across the 3 runs

**Recommendation:** Use Demo Mode for presentation and Report Mode for published benchmark tables.

### Side-by-Side Display Template

```text
┌─────────────── Model A ────────────────┬─────────────── Model B ────────────────┐
│ RM-07                                 │ RM-07                                 │
│ ANSWER: avg_speed=48 km/h             │ ANSWER: avg_speed=50 km/h             │
│ Answer Axis: ✅                        │ Answer Axis: ❌                        │
│ Trace Axis: ✅                         │ Trace Axis: ❌                         │
│ Score: 100                            │ Score: 0                              │
└───────────────────────────────────────┴───────────────────────────────────────┘
```

---

## Limitations & Honesty Statement

ReasonMath-15 is **not**:
- an academic math benchmark
- a symbolic-math benchmark
- a test of long-form chain-of-thought quality
- a measure of latency, token efficiency, or tool use
- statistically sufficient when reported from a single run only

ReasonMath-15 **is**:
- a practical reasoning benchmark with deterministic scoring
- suitable for small local models and visible side-by-side comparisons
- designed around published answer schemas and checkpoint-based grading
- intentionally limited in scope so that every scenario can be inspected by humans

---

## Changelog

**v1.0 (April 2026):**
- initial public release with 15 scenarios across 5 categories
- explicit answer schemas and deterministic answer checks
- a checkable work-trace axis for visible reasoning
- corrected RM-13 compound-interest answer to `$5721.24` and `$721.24`
- fully specified the host policy in RM-06
- a single-answer relation riddle in place of the open-ended surgeon prompt
- reproducibility controls for local-model benchmarking
- Demo Mode and Report Mode

---

## License

ReasonMath-15 is released under the MIT License. See the repository `LICENSE` file for the governing terms.
