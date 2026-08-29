# GLM-5.3-Flash implementation prompt: two print-ready invoice UIs

You are working in the existing **LCS Freight Forwarding frontend** repository. Implement the feature completely; do not stop after analysis or provide only a proposal.

## Goal

Build a professional invoice printing workflow with **two distinct print UIs** based on the supplied PDF references:

1. **Tax Invoice** - based on `LCSINV2026-12.pdf`.
2. **Debit Note** - based on `DCN_SWO26081140.pdf`.

Use the supplied `lcs invoice logo.png` as the approved default LCS issuer logo for these printable documents. This is an intentional project asset, not a value to reconstruct from the PDFs.

The references are visual/data examples only. Do not copy their specific customer, supplier, invoice number, amount, bank account, dates, stamps, signatures, email addresses, or other business values into Vue/CSS. Every printed value must come from the selected record, related records, organization/branch data, financial-account data, or System Settings.

The WhatsApp screenshot only explains the business context: a supplier sent a debit note and asked LCS to issue an invoice for a transportation fee. It is not an implementation instruction and its chat text must not appear in the UI.

## Mandatory repository rules

Before editing, read and follow:

- `AGENTS.md`
- `.opencode/skills/freight-erp-pages/SKILL.md`
- `.opencode/skills/freight-erp-pages/pages.md`
- `.opencode/skills/freight-erp-pages/components.md`
- `.opencode/skills/freight-erp-pages/stack.md`

Important constraints:

- Keep Nuxt 4, Nuxt UI, TypeScript, Tailwind, Pinia/mock repositories, and the existing visual system. Do not add another UI kit or redesign the application.
- Reuse `DocumentView`, `AppDocumentPage`, `AppLineTable`/`UTable`, current settings repositories, `useAppBranding`, `useAppLocalization`, auth/tenant scope, and existing format helpers.
- Do not create duplicate financial-document or service-charge page shells.
- Do not hardcode form fields, option arrays, status colors, labels, tenant branding, company identity, bank details, Khmer/English strings, or date/currency formats in page components.
- Put reusable print-template definitions/mappings in config/types/utilities and render them through shared print components.
- Do not use raw `<table>` markup. Use `UTable` with the existing compact table utilities or extend the existing shared line-table renderer.
- Do not use `window.prompt`, `alert`, or `confirm`.
- Add all user-facing text to both `i18n/locales/en.json` and `i18n/locales/km.json`.
- Respect `auth.canAccessPage`, organization/branch scope, and export/print feature flags. Frontend permission checks are visibility controls, not security.
- Do not allocate official invoice/debit-note numbers in the UI.
- Preserve all unrelated user changes in the working tree.

## Start with an audit

Inspect the current implementation, especially:

- `app/components/freight/DocumentView.vue` (the existing `print` action currently calls `window.print()` directly)
- the service-charge module at `/service-charges`
- the financial-document module at `/finance/documents`
- `app/config/freight-modules.ts`
- `app/config/lcs-reference-modules.ts`
- settings schemas/repositories and the organization, branch, business-party, service-order, service-charge, financial-document, and financial-account mock records
- existing document chrome, modal, table, localization, amount/date formatting, permission, and feature-flag patterns
- `lcs invoice logo.png`, its transparent padding/aspect ratio, and the current App Info `branding.mainLogoUrl` storage/loading path

Before large edits, output this short audit:

```text
Area | Existing | Gap | Reuse/Action
Print action | ... | ... | ...
Tax Invoice layout | ... | ... | ...
Debit Note layout | ... | ... | ...
Data/settings | ... | ... | ...
```

Then implement the gaps.

## Required user flow

1. On an existing printable Service Charge or supported Financial Document, clicking **Print / Download** opens a compact Nuxt UI modal instead of printing the editor page.
2. The modal displays two clear choices with a small description and icon:
   - Tax Invoice
   - Debit Note
3. The default choice should be derived from document type when possible, but the user can switch templates.
4. Actions:
   - **Preview** opens a dedicated clean print preview for the selected record/template.
   - **Print** invokes the browser print dialog only after the preview is rendered.
   - **Close/Back** returns safely to the document without losing unsaved state.
5. The preview has non-printing controls for Back, template switcher, Print, and Download/Save as PDF only if an existing safe client-side mechanism already exists. Do not add a heavy PDF library solely for this task; browser “Save as PDF” is acceptable.
6. The app sidebar, editor toolbar, tabs, comments, toasts, and modal chrome must never appear on paper.
7. Use a stable, shareable preview route or an equivalent isolated print shell. Route files must stay thin. Do not clone `DocumentView`.

## Shared print architecture

Create one reusable print workflow, not two unrelated implementations. A good structure is:

- a small print-template type/config defining template id, supported collections/document types, title, orientation, and field/data mapper;
- one shared selection modal;
- one shared preview/page shell;
- shared primitives for issuer header, party block, metadata rows, line items, totals, bank block, signature block, and print footer;
- two distinct layout renderers, **Tax Invoice** and **Debit Note**, composed from those primitives.

Names and exact file placement should follow existing conventions after inspection. Avoid speculative abstractions that are not used by both layouts.

Create a single typed print-view model so layouts do not read arbitrary raw record keys everywhere. The mapper should resolve data from the current scoped record and related collections, for example:

- issuer: organization legal/display name, tax identifier, logo, branch address/phone/email;
- party: legal/display name, address, tax identifier, contact details;
- document: number, type, issue/billing date, due date, currency, status, remarks;
- job/shipment: service order/work number, B/L or master number, house number, origin/loading port, destination/discharge port, ETD, ETA, vessel, voyage, container number/type, package, shipper, consignee, notify party;
- lines: description, quantity, unit, unit price, currency, discount/tax, debit, credit, and line total as applicable;
- totals: subtotal, discount, tax/VAT rate and amount, grand total, outstanding/balance, exchange rate, optional local-currency total, and amount in words;
- settlement: selected financial account, bank name, account name, masked/print-authorized account number, SWIFT code if configured;
- audit/footer: print date/time, current user display name, and page counter.

Use safe fallbacks (`-` or omitted optional rows) and never render `undefined`, `null`, `NaN`, invalid dates, secrets, internal notes, ledger-only fields, unmasked sensitive account data, or unrelated supplier credentials. If required print-profile fields are missing from the current model, extend the appropriate reusable organization/branch/financial-account/System Settings schema and mock repository with helper text in English and Khmer. Do not create a page-local settings object.

## Approved LCS logo asset

- Source asset: `lcs invoice logo.png` in the repository root.
- Move or copy it into the repository's established public/static branding asset location using a stable, URL-safe filename such as `lcs-invoice-logo.png`; do not leave a runtime dependency on a root filename containing spaces if the app's asset conventions expect public URLs.
- Register that stable asset URL as the **default LCS tenant** value for App Info `branding.mainLogoUrl` through the existing settings seed/repository. The print mapper/layout must read the logo from branding/settings rather than directly importing a tenant-specific file inside the component.
- A logo uploaded or selected later in System Settings must override this default without code changes. Other organizations/tenants must not be forced to display the LCS logo.
- Use this logo in the issuer header of both the Tax Invoice and LCS-issued Debit Note. If a Debit Note represents an external supplier document, use that supplier/organization's configured logo instead; never falsely brand an external issuer as LCS.
- The PNG has transparency and a wide composition. Preserve its intrinsic aspect ratio with `object-fit: contain`; never crop, stretch, recolor, redraw, place it on a dark fill, or convert transparent padding into a visible box.
- Size it consistently in the preview and print layouts (approximately 32-38 mm wide on A4 unless visual QA shows a better fit). Keep it sharp, aligned with the issuer identity block, and away from page edges.
- Provide meaningful alt text from the configured organization name. If the image fails to load, keep the legal issuer name visible and let the layout collapse cleanly without a broken-image icon.
- Do not base64-inline the logo repeatedly in each rendered document. Use the optimized static asset URL, and confirm it is fully loaded before calling `window.print()`.
- Do not use the logo as a scanned page background, watermark, stamp, or signature.

## UI 1: Tax Invoice

Reproduce the information hierarchy of `LCSINV2026-12.pdf` as a clean, modern, print-faithful **A4 landscape** document. Do not embed the scanned PDF as a background.

Required sections:

- bilingual Khmer/English issuer header with logo, legal name, VAT/TIN, address, telephone, and email;
- for the default LCS tenant, that header must render the approved `lcs invoice logo.png` asset through `branding.mainLogoUrl`;
- centered bilingual title: **Tax Invoice**;
- customer block with customer name, address, telephone, and VAT/TIN;
- invoice metadata block with invoice number and date;
- compact line-items table: No., Description of Goods or Services, Quantity, Unit Price, Amount;
- totals: subtotal, VAT/tax rate and amount, grand total in document currency, optional grand total in local currency, and exchange rate;
- organization bank/payment information;
- customer and seller signature/name areas. Show configured signature/stamp assets only when available; otherwise leave professional blank signature lines. Never copy the stamps/signatures from the reference PDF.

The layout should support multiple lines and continue cleanly onto additional pages. Repeat the table header when possible and avoid splitting a line item or totals/signature block across pages.

## UI 2: Debit Note

Reproduce the information hierarchy of `DCN_SWO26081140.pdf` as a clean, modern, print-faithful **A4 portrait** document. Do not embed the source PDF as a background.

Required sections:

- issuer logo, legal name, address, tax code, phone, and email;
- use the approved LCS logo only when LCS is the actual issuer; otherwise use the issuer's configured logo or the text-only fallback;
- prominent centered title: **Debit Note**;
- optional approval/signature grid (Staff, Manager, General Manager, Director, President) driven by configuration; hide it cleanly when not configured;
- debit-note number, billing date, due date, person in charge, phone/fax/email when available;
- partner/customer block with address and tax identifier;
- shipment/work-information block: Work/Service Order No., House No., Master/B/L No., loading port, discharge port, ETD, ETA, vessel, voyage, container, invoice date, package, shipper, consignee, and notify party;
- compact line table: B/L or reference No., Description, Qty, Unit, Unit Price, Currency, Debit, Credit;
- total debit, total credit, balance amount and currency, plus amount in words;
- remarks, bank information, signed-by area;
- footer with localized print date/time, page X of Y, and current print user.

The debit/credit totals must be derived from line data and should never become accounting postings merely because the document is printed. Issuing a Service Charge remains operational; accounting is affected only through the existing explicit finance-document posting flow.

## Print and responsive behavior

- On screen, show a centered paper preview on a neutral background with a subtle shadow and readable zoom on desktop; on small screens it may horizontally scroll or scale without damaging the printed size.
- Add explicit `@page` rules per template (`A4 landscape` for Tax Invoice, `A4 portrait` for Debit Note).
- Add `@media print` rules that remove preview chrome, background, shadow, route shell, and controls; reset margins/colors; preserve borders; and use `print-color-adjust: exact` where useful.
- Use fonts that correctly render both Khmer and Latin text and already exist in the project/system. Do not fetch a remote font at print time.
- Use millimetre-based page sizing/margins for reliable A4 output.
- Right-align numeric/currency cells and use tabular numerals.
- Prevent clipped content, overlapping blocks, blank extra pages, orphaned headings, and totals separated from their labels.
- Printing either template must not mutate document status, allocate a number, create a journal, or change accounting data.

## Data behavior and business rules

- Service Charge -> Create Finance Invoice -> Draft Financial Document -> Post -> Journal remains unchanged.
- Draft financial documents may be previewed with a visible **DRAFT** watermark; posted documents are read-only. Do not imply a draft is tax-posted.
- Cancelled/reversed records must show a localized **CANCELLED** or **REVERSED** watermark.
- Internal notes and secrets must not print.
- Calculations must use existing normalized line/totals helpers where possible. Do not duplicate money/date/tax helpers in components.
- Respect the active locale for labels and formatting. Where the Tax Invoice reference is explicitly bilingual, present Khmer and English labels together while formatting values using `useAppLocalization()`.
- Use the record currency; never assume USD. Show local-currency conversion only when a valid exchange rate and configured local currency are available.
- Amount-in-words must be deterministic, tested, currency-aware, and have a safe fallback for unsupported locales/currencies. Do not add a large dependency for it.

## i18n and accessibility

- Add complete English and Khmer keys for template names, fields, actions, empty/fallback states, watermarks, amount-in-words labels, and print footer.
- Give template cards/buttons accessible names, visible keyboard focus, and correct button semantics.
- Logos must have alt text. Decorative assets should be ignored by assistive technology.
- Maintain sensible reading order in both preview and printed DOM.

## Tests and verification

Add focused tests following the repository's current test conventions for:

- raw-record-to-print-view-model mapping;
- tax, subtotal, total, exchange-rate/local-total calculations;
- debit/credit totals and balance;
- amount-in-words helper;
- default template selection by collection/document type;
- hidden internal fields and safe missing-value behavior;
- status watermark selection;
- print modal/preview action wiring if component tests are already configured.

Run the repository checks that exist (at minimum `pnpm typecheck`, `pnpm lint`, and relevant tests). Fix regressions caused by your work; report unrelated pre-existing failures separately.

Visually verify both templates using representative mock records:

- A4 landscape Tax Invoice;
- A4 portrait Debit Note;
- one multi-line/multi-page case;
- English and Khmer;
- draft and posted/reversed/cancelled states;
- missing optional shipment, bank, signature, and logo fields;
- approved LCS logo at normal and high-DPI print preview, plus the broken/missing-logo fallback;
- print preview at desktop and mobile widths.

Use browser print preview or Playwright screenshots if available. Do not finish with obvious clipping, overlap, overflow, broken Khmer glyphs, `undefined`, incorrect totals, or application chrome on the printed page.

## Definition of done

- The Print / Download action opens the two-template selector.
- Both Tax Invoice and Debit Note previews render real scoped record data.
- The supplied LCS logo is stored in the proper static asset location, configured as the LCS tenant default, loaded through branding settings, displayed without distortion, and replaceable from System Settings.
- Both produce clean A4 output in the required orientation.
- The solution is reusable, typed, localized, permission-aware, settings-driven, and mock/API-boundary compatible.
- No company/customer/reference-PDF values are hardcoded.
- No duplicate page shell, raw table, native prompt/alert/confirm, new UI kit, or dead component remains.
- Existing financial posting behavior is unchanged.
- Typecheck, lint, and relevant tests pass, or unrelated existing failures are documented with evidence.

At completion, provide a concise summary of changed files, the two supported print flows, verification performed, and any remaining limitations.
