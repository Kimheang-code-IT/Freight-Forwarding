# Dynamic component cardinality plan: single-instance and repeatable

> Implementation status (2026-08-29): Complete in the mock-first frontend. Template mode, assignment override, migration compatibility, authoritative create limits, multi-record UTable/slideover UI, deletion safeguards, English/Khmer copy, and focused tests are implemented.

## Objective

Complete the custom/dynamic component system so an administrator can configure whether each component template creates:

- **Single instance** - one component record/form for a service order; or
- **Repeatable** - zero, one, or many component records for the same service order and component group.

The main business example is **Commercial Invoice**: one shipment/service order may contain several commercial invoices. Each invoice must be its own component instance with its own captured values, status, audit information, and template version.

The supplied screenshots are evidence of the current UI and the missing behavior. They are not implementation instructions. They show:

- Component Template Details currently has General, Classification, Version, and Control sections but no clear component-level cardinality control.
- The Service Order Invoice tab currently renders one inline Commercial Invoice form, which cannot represent multiple invoices.

Do not hardcode a special multi-invoice page. The same behavior must work for any configured component template, such as Packing List, Bill, Customs Declaration, Truck Dispatch, Certificate, or a future custom component.

## Mandatory project rules

Before implementation, read and follow:

- `AGENTS.md`
- `.opencode/skills/freight-erp-pages/SKILL.md`
- `.opencode/skills/freight-erp-pages/pages.md`
- `.opencode/skills/freight-erp-pages/components.md`
- `.opencode/skills/freight-erp-pages/stack.md`

Keep Nuxt 4, Nuxt UI, TypeScript, Tailwind, the mock-first repository boundary, the existing application design, and the schema-driven dynamic field renderer. Do not add a second UI kit, clone the job workspace, or create Vue forms for individual task types.

Reuse and extend the existing implementation, especially:

- `app/config/lcs-reference-modules.ts`
- `app/config/lcs-seed.ts`
- `app/components/freight/JobTasks.vue`
- `app/utils/freight/job-component-tabs.ts`
- `app/utils/freight/job-task-fields.ts`
- `app/components/document/AppDynamicFieldRenderer.vue`
- `app/components/table/AppLineTable.vue` or `UTable` with the compact table utilities
- `app/repositories/contracts/lcs.ts`
- `app/repositories/mock/lcs.ts`
- `app/repositories/http/lcs.ts`
- `app/utils/lcs/commands.ts`

All form controls must be size `md` and show ERPNext-style helper text. Add all user-facing copy to both `i18n/locales/en.json` and `i18n/locales/km.json`. Respect organization, branch, permissions, captured template versions, and backend authority.

## Current-state audit

The repository already has partial repeatability support:

- `componentTemplates` seed records contain a `repeatable` Yes/No value, but the Component Template Details fields do not expose a clear template-level setting.
- Template **attribute** rows also contain a `repeatable` field. That is attribute-value multiplicity and must not be confused with component-instance cardinality.
- `tradeDirectionComponents` contains another `repeatable` Yes/No field.
- `isRepeatableComponent()` currently uses Boolean OR between assignment and template flags.
- `JobTasks.vue` can display a list and uses `forceNew` for a repeatable component, but the overall configuration, precedence, migration, validation, and lifecycle are incomplete.
- `ensureServiceComponent()` prevents duplicates for a non-repeatable group but relies on client payload flags and does not provide a complete authoritative cardinality contract.

Before large changes, output this audit table and update it with exact findings:

```text
Area | Existing | Missing/Risk | Action
Template configuration | Partial hidden flag | No clear instance mode | Add schema-driven control
Assignment override | Yes/No flag | Ambiguous precedence | Add inherit/single/repeatable resolution
Service-order UI | Partial list/slideover | Incomplete multi-instance UX | Complete shared renderer
Repository/domain | ensure + forceNew | Weak cardinality contract | Add authoritative commands
Migration/versioning | Partial | Historical behavior unclear | Capture resolved mode
```

Then implement the gaps; do not stop at a proposal.

## 1. Use explicit cardinality terminology

Introduce a typed component-instance mode instead of spreading ambiguous Yes/No checks:

```ts
type ComponentInstanceMode = 'SINGLE' | 'REPEATABLE'
type ComponentInstanceModeOverride = 'INHERIT' | ComponentInstanceMode
```

Preferred persisted fields:

- Component Template: `instanceMode: 'SINGLE' | 'REPEATABLE'`
- Trade Direction Component assignment: `instanceModeOverride: 'INHERIT' | 'SINGLE' | 'REPEATABLE'`
- Service Component instance: `resolvedInstanceMode: 'SINGLE' | 'REPEATABLE'`

Keep a backward-compatible normalization layer while mock/API data still contains `repeatable: 'Yes' | 'No' | boolean`. Do not keep branching on several raw string/Boolean shapes throughout components.

Create one shared resolver:

```text
explicit assignment override
  -> otherwise template instanceMode
  -> otherwise legacy repeatable flag
  -> otherwise SINGLE
```

Do not use the current OR rule. It cannot represent an explicit assignment override from repeatable back to single.

## 2. Component Template configuration UI

On `/configuration/component-templates/:id` and `/new`, add a schema-driven **Behavior** section to the existing Details tab. Do not hand-code fields in the route component.

Add:

- **Instance Mode** (required select or radio cards)
  - Single instance
  - Repeatable
- Helper text:
  - English: “Choose whether each service order stores one component record or can store multiple records.”
  - Khmer equivalent.
- When Repeatable is selected, optionally show:
  - **Minimum Instances** - default `0`, or `1` when the assignment is required.
  - **Maximum Instances** - empty means unlimited; must be greater than or equal to minimum.

Keep the UI compact and consistent with the screenshot and existing `DocumentView`. Add **Instance Mode** to the Component Templates list so administrators can see the behavior before opening a record.

Do not label the component-level setting only as “Repeatable” next to the Template Attributes table; that is too easy to confuse with an attribute that accepts multiple values. Use “Instance Mode” and clear helper text.

### Attribute-level repeatability

Audit the existing `attributes[].repeatable` field separately:

- If it is implemented as a multi-value attribute, rename its label to **Multiple Values** and document its behavior.
- If multi-value attributes are not implemented, do not pretend the checkbox works. Hide/remove it from the active UI or mark it out of scope until the shared renderer supports array values.
- Component `instanceMode` controls the number of component records; attribute “Multiple Values” controls values inside one record. Never treat them as the same setting.

## 3. Trade Direction assignment and precedence

`/configuration/trade-direction-components` may customize a template differently for Import and Export. Replace the ambiguous assignment Yes/No with:

- **Instance Mode Override**
  - Use template setting (`INHERIT`) - default and recommended
  - Single instance
  - Repeatable

Show read-only helper/preview text such as:

```text
Template default: Repeatable
Effective for Import: Single instance
```

Keep Required, Display Order, Template Version, and Status behavior unchanged.

Validation rules:

- An active assignment must reference an active group and a valid template version.
- The template must belong to the assigned component group.
- Only one active effective assignment for the same organization + trade direction + component group + template/version is allowed unless the current domain explicitly supports multiple templates in one group.
- A blank/legacy override is normalized to `INHERIT`.

## 4. Versioning and historical records

Instance mode is versioned behavior.

- New jobs/components use the effective mode resolved from the current active template version and assignment.
- When a component instance is created, capture `templateCode`, `templateVersion`, and `resolvedInstanceMode` on that instance.
- Existing service-component records keep their captured values and mode. A newer template or changed assignment must not silently convert a historical single record into a repeatable collection or collapse multiple records into one.
- If changing Instance Mode on a template version that is already used by jobs, follow the existing versioning policy: require/guide the administrator to create a new version instead of mutating historical behavior.
- Existing records without `resolvedInstanceMode` use a deterministic legacy migration/fallback and are stamped when safely saved; do not rewrite historical template values merely by viewing the job.

## 5. Service Order behavior: single instance

When effective mode is `SINGLE`:

- Keep the current compact inline dynamic form on the component-group tab.
- Create the component instance on first successful save, not merely on tab visit.
- Subsequent saves update the same scoped component instance.
- Enforce one active instance for organization + service order + component assignment/group/template identity at the domain/repository layer, not only in Vue.
- Never show an Add Another button.
- If legacy bad data contains more than one instance, do not silently discard records. Show the shared list with a localized warning and require an explicit cleanup/migration decision.

## 6. Service Order behavior: repeatable

When effective mode is `REPEATABLE`, replace the single inline form with a collection experience generated from the template.

### Empty state

- Do not automatically create a blank instance when the tab opens.
- Show a compact empty state: “No Invoice records yet” (use the configured group/template name, not a hardcoded Invoice string).
- Show **Add {Template Name}** when the user has `service_order.update` permission and the service order has been saved.

### Collection view

- Desktop/tablet: compact `UTable` using existing freight table utilities.
- Narrow/mobile screens: responsive stacked record cards or a safely scrollable compact table. The information hierarchy should remain usable like the screenshots.
- Header shows the configured section title, record count, template code/version hint, and Add action.
- Each record is a distinct service-component instance with stable `id` and `sequenceNo`.
- Default row/card title should be `{Template Name} #{sequenceNo}`; prefer a configured summary attribute such as invoice number when present.
- Allow template attributes to opt into the collection summary with a reusable setting such as `showInSummary` and `summaryOrder`. If none are configured, use the first 2-4 active attributes in display order. Do not hardcode `invoice_no`, `invoice_date`, seller, or amount in `JobTasks.vue`.
- Always include status, captured template version, updated time, and a `⋯` actions menu.
- Right-align numeric/currency values and format them through `useAppLocalization()`.

### Add, view, and edit

- **Add** opens the existing shared slideover/modal pattern with a fresh value set generated from the captured template attributes.
- **View** opens the same renderer read-only.
- **Edit** opens the same renderer in edit mode; do not create a separate form.
- Every attribute renders through `AppDynamicFieldRenderer` based on captured `dataType`/`inputType`, including its required rule, validation, options, visibility, and helper text.
- Save creates exactly one new instance and returns it to the list without changing other instances.
- Cancel discards the unsaved draft and must not create an empty record.
- Prevent duplicate requests/double clicks while saving. Use idempotency for create/complete commands where the architecture supports it.
- After creation, reset selection/draft state correctly so a second Add creates a new record rather than overwriting the first.

### Actions and lifecycle

Each row/card uses the shared `⋯` action menu:

- View
- Edit (when permitted and not immutable/completed)
- Complete (after validation)
- Delete draft/pending instance, if domain rules allow

Deletion must use `AppConfirmDialog`/`useConfirm`, require permission, be tenant/branch scoped, and write an audit entry. Never use native `confirm`. Completed/historical instances should be immutable; use an explicit cancel/void/reopen workflow if supported rather than silently deleting them.

## 7. Required and completion semantics

Define requirements at both levels:

- **Required component assignment**
  - Single: the one component instance must exist and meet completion rules.
  - Repeatable: at least `minimumInstances` valid/completed instances must exist. Default minimum is `1` when required, otherwise `0`.
- **Required template attributes**
  - Apply independently to every component instance.
  - A repeatable collection is not valid merely because one row is complete if another row being completed is missing required attributes.

Before a service order can complete/close, validate every required component assignment using its captured effective mode and minimum. Return actionable localized messages, for example:

```text
Invoice requires at least 1 completed record.
Commercial Invoice #2 is missing Invoice No. and Invoice Date.
```

Do not count an empty unsaved draft. Clearly define whether Cancelled/Voided instances count; the safe default is no.

## 8. Domain and repository contract

Make cardinality authoritative below the UI.

Replace or clarify ambiguous `ensureForJob(... forceNew)` behavior with explicit typed operations, for example:

- `getOrCreateSingleForJob(...)` or `saveSingleForJob(...)`
- `createForJob(...)` for every repeatable instance
- `updateValues(componentId, values)`
- `complete(componentId, idempotencyKey)`
- `removeDraft(componentId, idempotencyKey)` when allowed

Exact names may follow repository conventions, but calls must make intent unambiguous. Update mock and HTTP repositories together so the page contract remains stable when mock mode is disabled.

Backend/domain invariants:

- Verify access to the organization, branch, and service order.
- Resolve or verify cardinality from server-known template/assignment data; do not trust a client Boolean alone.
- SINGLE rejects a second active instance for the same effective assignment.
- REPEATABLE permits multiple instances and assigns a collision-safe stable sequence number.
- Enforce optional maximum instances atomically.
- Creation/update/complete/delete writes audit records.
- Captured `templateVersion`, attribute definitions/values, and `resolvedInstanceMode` remain immutable except through an explicit migration.
- Concurrent Add requests must not produce the same sequence number or bypass maximum limits when the HTTP backend is implemented.

Printing, completing, or saving a dynamic component must not create financial postings. Invoice task components are operational shipment documents, distinct from posted Finance customer invoices.

## 9. Migration plan

Create a deterministic migration/normalization for existing mock and future API data:

- Template `repeatable: Yes/true` -> `instanceMode: REPEATABLE`.
- Template `repeatable: No/false/missing` -> `instanceMode: SINGLE`.
- Existing assignment values that merely duplicate the old template flag should become `instanceModeOverride: INHERIT`.
- Preserve a genuinely different assignment value as an explicit SINGLE or REPEATABLE override.
- Existing service components get a derived `resolvedInstanceMode`; if more than one instance already exists for a supposedly single group, preserve them and flag the data conflict rather than deleting/merging them.
- Keep legacy read compatibility until HTTP/API migration is complete, then remove dead fallback code in a separate safe cleanup.

Seed Commercial Invoice as `REPEATABLE` for representative Import and Export assignments so a service order can demonstrate two or more invoices. Keep components that are naturally single as SINGLE unless business rules say otherwise. Do not assume every document is repeatable.

## 10. Localization, permissions, and accessibility

Add English and Khmer keys for:

- Instance Mode, Single instance, Repeatable, Use template setting
- minimum/maximum instances and helper text
- Add/View/Edit/Delete component record
- record count and sequence labels
- empty state, limit reached, duplicate single-instance error
- required collection/completion errors
- legacy cardinality conflict warning

Use current permission checks such as `lcs.can('service_order.update')` and configuration permissions. Frontend hiding is not security.

The collection and editor must be keyboard accessible:

- meaningful Add and row-action labels using the configured template name;
- visible focus states;
- correct dialog/slideover title and focus handling;
- field errors associated with their controls;
- mobile cards preserve logical reading order.

## 11. Tests

Add focused tests using the repository's current conventions.

### Resolver/config tests

- assignment INHERIT uses template mode;
- assignment SINGLE overrides a repeatable template;
- assignment REPEATABLE overrides a single template;
- legacy Yes/No/Boolean normalization;
- missing values default to SINGLE;
- attribute-level repeatability does not change component instance mode.

### Domain/repository tests

- SINGLE creates once and updates the same instance;
- SINGLE rejects a second active instance;
- REPEATABLE creates multiple independent instances with unique sequence numbers;
- editing one repeatable instance does not mutate another;
- canceling an unsaved Add creates nothing;
- minimum/maximum limits;
- required attributes are checked per instance;
- completed instances are immutable/deletion-protected;
- tenant/branch access and audit behavior;
- historical `templateVersion` and `resolvedInstanceMode` remain captured.

### UI tests

- template Details shows Instance Mode and helper text;
- assignment shows template default and effective mode;
- SINGLE renders the inline form and no Add Another action;
- REPEATABLE renders empty state/list, Add, row/card summaries, and shared slideover;
- two commercial invoices can be added to one service order and edited independently;
- responsive mobile collection remains usable;
- English and Khmer labels/help/errors render.

Run at minimum `pnpm typecheck`, `pnpm lint`, and relevant tests. Report unrelated pre-existing failures separately with evidence.

## Acceptance scenarios

### Scenario A: one commercial invoice

1. Configure Commercial Invoice as SINGLE.
2. Open a saved service order -> Invoice tab.
3. One inline dynamic form appears.
4. Save creates one instance; subsequent saves update it.
5. No Add Another action is available.

### Scenario B: multiple commercial invoices

1. Configure Commercial Invoice as REPEATABLE (or set the direction assignment override to REPEATABLE).
2. Open a saved service order -> Invoice tab.
3. A collection empty state appears with Add Commercial Invoice.
4. Add invoice `INV-001`, save, then add `INV-002`.
5. Both records appear as separate rows/cards with independent values, status, version, and audit data.
6. Editing `INV-002` does not change `INV-001`.
7. The service order completion rule counts the required completed invoice instances correctly.

### Scenario C: historical version

1. A service order has two repeatable invoice instances captured at template version `2026.08`.
2. Administrator creates version `2026.09` and changes the default to SINGLE.
3. The old service order still displays both `2026.08` records as repeatable.
4. New assignments/jobs follow `2026.09` according to the effective override.

## Definition of done

- Component Template Details visibly and clearly configures Single instance or Repeatable.
- Trade Direction assignment has deterministic inherit/override behavior.
- Cardinality is typed, normalized once, captured with the component instance, and enforced below Vue.
- Any repeatable template can create multiple independent rows/cards through the shared renderer.
- Any single template continues to use one inline form.
- One service order can contain multiple commercial invoices without hardcoded Invoice components.
- Required/completion, versioning, permissions, audit, localization, responsive behavior, and migration are covered.
- No raw `<table>`, native dialogs, copied per-task forms, hardcoded option arrays, duplicate page shells, or orphaned components are introduced.
- Typecheck, lint, and relevant tests pass, or unrelated existing failures are documented.

At completion, summarize changed files, migration behavior, effective cardinality rules, tests run, and any remaining backend/API limitations.
