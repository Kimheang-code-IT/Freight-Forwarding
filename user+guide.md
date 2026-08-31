# LCS Freight Forwarding — Client User Guide

This guide is for **staff who use the system every day**: sales, operations, finance, and administrators. It explains each screen in the same order as the left sidebar, in plain language.

You only see pages your role is allowed to open. If a menu item is missing, ask an administrator to review your role.

**Standard User** can open all operational, finance, master-data, and report pages, plus **Users** and **Roles & Permissions** (view). Configuration, System Settings, Organizations, Branches, Document Sequences, and Audit Logs stay with administrators.

---

## Contents

1. [Getting started](#1-getting-started)
2. [How every list and record works](#2-how-every-list-and-record-works)
3. [Recommended daily workflow](#3-recommended-daily-workflow)
4. [Dashboard](#4-dashboard)
5. [Quotations](#5-quotations)
6. [Service Orders](#6-service-orders)
7. [Service Charges](#7-service-charges)
8. [Finance](#8-finance)
9. [Operations reports](#9-operations-reports)
10. [Financial reports](#10-financial-reports)
11. [Master data](#11-master-data)
12. [Configuration](#12-configuration)
13. [Administration](#13-administration) (Users and Roles are included for Standard User)
14. [Print preview](#14-print-preview)
15. [Sign-in and password](#15-sign-in-and-password)

---

## 1. Getting started

### Sign in

1. Open the application.
2. Enter your **email** and **password**.
3. Optionally keep **Remember me** checked so your email is filled next time.
4. Choose **English** or **Khmer** on the login screen if needed, then sign in.

If you forget your password:

1. Open **Forgot password**.
2. Enter your email and request a code.
3. Enter the **6-digit verification code**.
4. Set a new password (at least 6 characters) and sign in again.

### Screen layout

| Area | What it does |
|------|----------------|
| **Left sidebar** | All pages you are allowed to open. Groups can be expanded or collapsed. On a small screen the sidebar collapses automatically. |
| **Top bar** | Page title or breadcrumb, refresh, extra actions (`⋯`), and your user menu. On a record page you can also jump **Previous / Next** and return to the list. |
| **Main area** | The current list, form, dashboard, or report. |
| **Right panel** (on some records) | Comments, activity, and related links. Open or close it from the top bar. |

### Your user menu (top right)

Open your name or avatar to:

- Open **Profile**
- Switch **language** (English / Khmer)
- Change **font size**
- Switch **light / dark** appearance
- Open **About**
- **Log out**

### Search

Use the search box in the header (or **Ctrl+K** / **Cmd+K**) to jump to a page or find a record by keyword.

### What you will not see

Menus are filtered by **permission**, **organization**, and **branch**. Hiding a page in the menu is not a security control by itself — the system still checks access when you open a record.

**Standard User** still sees **Administration → Users** and **Administration → Roles**. Those two pages are view-only. You will not see Configuration, Organizations, Branches, Document Sequences, System Settings, or Audit Logs unless an administrator grants them.

---

## 2. How every list and record works

Most operational and master-data pages use the same pattern.

### List page

Typical toolbar:

- **Search** — type a number, name, or keyword.
- **Filters** — Customer, Branch, Status, Date range, and other fields for that module. A highlighted filter button means filters are active.
- **New** — create a record (only if your role can create).
- **Refresh** — reload the current list.

Typical table:

- Compact rows with a light hover highlight.
- Status shown as a **badge**.
- Money and quantities **right-aligned**.
- Row **`⋯`** menu for View, Edit, Print, or other actions.
- Pagination at the bottom.

Empty lists show **No records found.**

### Record page

Typical header:

- Record title and **status badge**
- Primary buttons (Save, Send, Issue, Post, …)
- Extra actions under **`⋯`**
- Previous / Next record

Typical body:

- **Tabs** for sections of the same record
- Form fields with a short **helper line under each field** — read it before filling
- Line tables with **Add** and row **`⋯`**
- Comments and activity on the right, when available

### Form rules that apply everywhere

- Field size is **medium**. Fill every required field before saving.
- Helper text under a field is part of the screen, not optional decoration.
- Official document numbers (quotation no., charge no., journal no., …) are **allocated by the system**, not typed by you as the final number.
- Confirmation dialogs replace browser pop-ups. Confirm before delete, submit, post, or close period.

---

## 3. Recommended daily workflow

Use this sequence unless your office has a different SOP.

```text
Quotation (Draft → Sent → Accepted)
        ↓ convert
Service Order (job workspace: route, containers, documents, files)
        ↓ commercial billing
Service Charge (Draft → Issue)
        ↓ create finance invoice
Financial Document (Draft → Post)
        ↓
Posted Journal  →  Financial reports
```

**Important commercial vs accounting rule**

| Action | Affects operations? | Affects accounting reports? |
|--------|---------------------|-----------------------------|
| Save / send a quotation | Yes | No |
| Run a service order | Yes | No |
| **Issue** a service charge | Yes (commercial) | **No** |
| Create a finance invoice | Yes | Not until posted |
| **Post** a financial document or journal | Yes | **Yes** (if the accounting period is open) |

Posted journals are the only source for Revenue & Expense, General Ledger, Trial Balance, Profit & Loss, Balance Sheet, and Cash & Bank.

**Gross profit** on reports = **Posted revenue − Posted cost**. Quoted amounts and issued service charges are not posted revenue.

---

## 4. Dashboard

**Menu:** Dashboard  
**Path:** `/`

### Purpose

A compact home screen for the signed-in organization and branch. It is for a quick look, not for working lists.

### What you see

**KPI cards**

- Open Orders
- In Progress
- On Hold
- Awaiting Closure
- Accounts Receivable
- Accounts Payable
- Cash / Bank
- Revenue

**Two charts** (each fills the remaining height)

1. **Revenue vs Expense** — line chart from **posted journals only**. Use **This Year / Last Year** and **Monthly / Quarterly / Yearly**.
2. **Service Orders by Status** — bar chart. The year control changes the data; period is chart display only.

On each chart, **`⋯`** downloads **PNG** or **CSV**.

### What this page does not do

- No organization / branch / date-range filter bar on the dashboard. Scope follows your login.
- No detailed aging tables here. Use **Accounts Receivable** and **Accounts Payable** reports.

---

## 5. Quotations

**Menu:** Quotations  
**Paths:** `/quotations` · `/quotations/new` · `/quotations/{id}`

### Purpose

Prepare, send, revise, and accept commercial offers. An **accepted** quotation is the only quotation that can become a service order.

### Who uses it

Sales and commercial staff.

### List

**Columns:** Quotation No., Customer, Direction, Branch, Revision, Date, Valid Until, Total, Status, Actions.

**Filters:** Search, Customer, Branch, Trade Direction, Status, Date Range.

Click a row to open it, or use **New**.

### Detail tabs

| Tab | What to do |
|-----|------------|
| **Overview** | Customer, branch, trade direction, currency, dates, validity, remarks. |
| **Route** | Places in the move (role, place, planned/actual, notes). |
| **Containers** | Container requirements for the offer. |
| **Pricing** | Fee lines: Service / Fee, Container, Qty, Unit, Unit Price, Discount, Tax, Total. |
| **Files** | Attach supporting files. |
| **Revisions** | History of earlier versions. |

The pricing table stays compact. Subtotal columns are not all shown permanently.

### Status rules (must follow)

| Status | You can edit? | Next typical action |
|--------|----------------|---------------------|
| **Draft** | Yes | Save, then **Send** |
| **Sent** | No | Customer replies; **Accept** or **Reject**, or **Create revision** |
| **Accepted** | No (use a revision to change) | **Convert to service order** |
| **Rejected / Cancelled** | No | Start a new quotation or a revision if allowed |

Rules in practice:

1. **Draft** is editable.
2. **Sent** is read-only.
3. Changing a sent quotation requires a **new revision**.
4. Only an **Accepted** quotation can convert.
5. Conversion is **explicit** — use the convert action. Do not assume sending a quote creates a job.

### Typical actions

- **Save draft**
- **Send** to the customer
- **Accept** / **Reject** / **Cancel**
- **Create revision** — opens the new revision
- **Convert to service order** — if a job already exists, the system opens that job instead of creating a second one
- **Print / Download**

If the quotation still has unsaved changes, save before submit/convert.

---

## 6. Service Orders

**Menu:** Service Orders  
**Paths:** `/service-orders` · `/service-orders/new` · `/service-orders/{id}`

### Purpose

This is the **job workspace** — the operational file for a freight move. Work the job here: parties, route, containers, direction-specific documents, finance snapshot, and files.

### Who uses it

Operations, documentation, and anyone updating job progress.

### List

**Columns:** Job No., Customer, Direction, Branch, Containers, Documents, Total Charges, Status, row meta (who updated, how recently, comment count), Actions.

**Filters:** Search, Customer, Branch, Direction, Status, Date Range.

### Detail tabs

Core tabs are always present. Extra tabs come from **Component Groups** configured for that trade direction (for example Customs, Invoice, Packing List). Those extra tabs are **dynamic forms**, not separate screens per document type.

| Tab | What to do |
|-----|------------|
| **Overview** | Customer, Branch, Trade Direction, Currency, Source Quotation, Status, Created Date, Created By, Description. Compact summary: containers, documents completed/total, total charges, invoice total. Edit only **Job Information, Dates, Reference, Remarks**. Invoice / packing list / B/L fields belong on component-group tabs. Route fields belong on Route. Comments stay in the right-hand panel. |
| **Route** | Compact table: #, Role, Place, Planned / Actual, Notes, Actions. |
| **Containers** | Requirements and actual boxes on **one tab**. Requirements: Type, Required, Actual, Remaining, Description. Actual: Container No., Type, Seal, Status, Net Weight, Gross Weight. **Gross weight must be ≥ net weight.** Service charges for the job can also be managed from this tab. |
| **Component-group tabs** | One form if the component is not repeatable (first save creates it). Repeatable components use a compact table plus **Add**, with the form in a slide-over. Required attributes must be filled before you mark that work complete. Helper text appears under each attribute. |
| **Finance** | Posted invoices, supplier costs, and receivables for this job. |
| **Files** | Job attachments. |

Reserved names `overview`, `route`, `containers`, `finance`, and `files` are core tabs and cannot be used as extra group tabs.

### Typical job flow

1. Open the job created from an accepted quotation (or create a job if your process allows it).
2. Complete Overview (customer, branch, direction, dates, remarks).
3. Enter Route places.
4. Enter container requirements, then actual container numbers, seals, and weights.
5. Complete each document tab required for that trade direction.
6. Attach files.
7. Raise **Service Charges** when ready to bill commercially.
8. Use **Finance** to see posted invoices and costs after accounting has posted.

---

## 7. Service Charges

**Menu:** Service Charges  
**Paths:** `/service-charges` · `/service-charges/new` · `/service-charges/{id}`

### Purpose

Commercial / operational billing for a job. **Issuing a service charge does not post to the general ledger.**

### Who uses it

Commercial and billing staff.

### List

**Columns:** Charge No., Service Job, Customer, Date, Currency, Total, Status, Invoice, Actions.

**Filters:** Search, Service Job, Customer, Branch, Status, Date Range.

### Header fields

Charge No., Service Job, Customer, Branch, Document Date, Currency, Status, Remarks.

### Detail tabs

| Tab | What to do |
|-----|------------|
| **General** | Link to the service order, party, dates, currency, remarks. |
| **Fee Lines** | Service / Fee, Container, Qty, Unit, Unit Price, Discount, Tax, Total. Summary: Subtotal, Discount, Tax, Total. |
| **Traceability** | Links to Finance Invoice, Posted Journal, and the chain quotation → service order → finance invoice → posted journal. **View** opens the linked record. |

### Actions

- **Save Draft**
- **Issue** — commercial issue only
- **Print / Download**
- **Create Finance Invoice** — creates a **draft** financial document and opens it

### Correct accounting path

```text
Service Charge  →  Create Finance Invoice  →  Draft Financial Document  →  Post  →  Journal
```

Do not treat **Issue** as posting.

---

## 8. Finance

Open **Finance** in the sidebar for these five pages.

### 8.1 Financial Documents

**Path:** `/finance/documents`

One shared document for all of these types:

- Customer Invoice
- Supplier Bill
- Customer Receipt
- Supplier Payment
- Other Income
- Other Expense
- Transfer
- Adjustment

**List columns:** Document No., Type, Party, Date, Due Date, Service Job, Total, Outstanding, Status, Actions.

**Detail tabs:** Overview, Lines, Allocation, Journal, Traceability, Files, Activity.

**Rules**

- **Draft** is editable.
- **Posted** is read-only.
- Corrections use **reversal** or **adjustment**, not editing a posted document.
- Posting requires an **open accounting period**.
- Posting creates a **balanced journal**.

From a service charge, **Create Finance Invoice** lands here as a draft. Review lines, then **Post** when the period is open.

### 8.2 Chart of Accounts

**Path:** `/finance/chart-of-accounts`

The ledger accounts used by journals and reports.

**Columns:** Account Code, Account Name, Type, Parent, Normal Balance, Postable, Status, Actions.

**Filters:** Search, Account Type, Parent, Postable, Status.

**Fields when creating/editing:** Account Code, Account Name, Account Type, Parent Account, Normal Balance, Postable, Status.

Only **postable** accounts should receive journal lines. Keep the hierarchy (parent / child) consistent before go-live.

### 8.3 Financial Accounts

**Path:** `/finance/financial-accounts`

Cash, bank, and settlement accounts linked to a ledger account.

**Columns:** Account Name, Ledger Account, Type, Currency, Bank, Account No., Balance, Status, Actions.

**Fields:** Ledger Account, Account Name, Account Type, Currency, Bank Name, Masked Account Number, Status.

Full account numbers are masked. Do not paste full banking secrets into remarks fields.

### 8.4 Journals

**Path:** `/finance/journals`

Double-entry books. Most journals are created automatically when you **post** a financial document. Manual journals are for adjustments that have no source document.

**List columns:** Entry No., Posting Date, Source, Branch, Description, Debit, Credit, Status, Actions.

**Manual lines:** Account, Party, Service Job, Description, Debit, Credit, Currency.

The header shows **Total Debit**, **Total Credit**, and **Balance Difference**.

**Rules**

- You can **Post** only when Total Debit = Total Credit.
- Posted journals **cannot be edited**. Reverse or adjust instead.
- Closed accounting periods reject posting.

### 8.5 Accounting Periods

**Path:** `/finance/accounting-periods`

Controls which dates may be posted.

**Columns:** Period, Start Date, End Date, Status, Posting Count, Closed By, Closed At, Actions.

**Actions:** View, **Close**, **Reopen**.

Close a period only when operations and finance agree that posting for that month is finished. A closed period must reject new posting.

---

## 9. Operations reports

**Menu group:** Operations Reports  
**Hub:** `/reports` (all reports)  
**Each report:** `/reports/operations/{slug}`

Every report has a compact header, filters, a small KPI strip where relevant, a table or statement, and **Export**.

Posted-accounting numbers appear only where this guide says so. Operational reports may include job and charge figures that are **not** posted.

### 9.1 Service Order Register

**Path:** `/reports/operations/service-orders`

Complete register of jobs.

**KPIs:** Total Orders, Open, In Progress, On Hold, Completed.

**Columns:** Job No., Date, Customer, Branch, Direction, Containers, Documents, Charge Total, Invoice Total, Status.

**Filters:** Branch, Party, Status, Date.

Use this for volume and a full job list.

### 9.2 Service Order Status

**Path:** `/reports/operations/service-order-status`

Progress, aging, and pending work.

**Summary counts:** Draft, Open, In Progress, On Hold, Completed, Closed, Cancelled.

**Columns:** Job No., Customer, Branch, Direction, Created Date, Status, Days Open, Pending Components, Last Activity.

Use this in operations meetings to find stalled jobs.

### 9.3 Containers

**Path:** `/reports/operations/containers`

Actual containers on service orders.

**Columns:** Container No., Type, Service Job, Customer, Branch, Seal, Status, Net Weight, Gross Weight, Current Milestone.

**Filters:** Branch, Party, Status.

### 9.4 Profitability

**Path:** `/reports/operations/profitability`

Compares commercial figures with **posted** accounting.

**KPIs:** Revenue, Cost, Gross Profit, Margin %.

**Columns:** Job No., Customer, Branch, Quoted, Service Charges, Posted Revenue, Posted Cost, Gross Profit, Margin %.

**Gross Profit = Posted Revenue − Posted Cost.** Quoted and service-charge totals are shown for comparison only.

---

## 10. Financial reports

**Menu group:** Financial Reports  
**Each report:** `/reports/finance/{slug}`

Unless noted, these reports use **posted journals only**. Draft invoices, issued service charges, and unposted journals do not belong in these balances.

### 10.1 Revenue & Expense

**Path:** `/reports/finance/revenue-expense`

**KPIs:** Revenue, Expense, Net Result.

**Columns:** Date, Account, Category, Party, Service Job, Description, Revenue, Expense, Branch.

### 10.2 Accounts Receivable

**Path:** `/reports/finance/accounts-receivable`

Posted customer invoices minus valid receipt allocations.

**KPIs:** Total Receivable, Not Due, 1–30, 31–60, 61–90, 90+.

**Columns:** Invoice No., Customer, Service Job, Invoice Date, Due Date, Total, Paid, Outstanding, Aging, Status.

### 10.3 Accounts Payable

**Path:** `/reports/finance/accounts-payable`

Same layout as receivables, for suppliers.

**Columns:** Bill No., Supplier, Service Job, Bill Date, Due Date, Total, Paid, Outstanding, Aging, Status.

### 10.4 General Ledger

**Path:** `/reports/finance/general-ledger`

Posted movement by ledger account.

**Filters:** Branch, Account, Party, Service Job, Period, Date Range.

**Columns:** Posting Date, Journal No., Source Document, Account, Description, Debit, Credit, Running Balance, Branch.

**Summary:** Opening Balance, Total Debit, Total Credit, Closing Balance.

### 10.5 Trial Balance

**Path:** `/reports/finance/trial-balance`

**Columns:** Account Code, Account Name, Opening Debit, Opening Credit, Period Debit, Period Credit, Closing Debit, Closing Credit.

Footer: **Total Debit**, **Total Credit**, **Difference**. Difference must be **zero** when posted data is balanced.

### 10.6 Profit & Loss

**Path:** `/reports/finance/profit-loss`

Statement layout (not a wide operations table) from posted revenue and expense accounts.

### 10.7 Balance Sheet

**Path:** `/reports/finance/balance-sheet`

Assets / Liabilities / Equity statement. The screen shows Assets, Liabilities + Equity, and **Difference** (should be zero).

### 10.8 Cash Flow / Cash & Bank

**Path:** `/reports/finance/cash-flow`

Practical cash and bank movement from posted journals that hit cash/bank accounts. The system does not invent operating / investing / financing classifications.

**KPIs:** Opening Balance, Cash In, Cash Out, Closing Balance.

**Columns:** Date, Financial Account, Source, Reference, Party, Description, Cash In, Cash Out, Running Balance.

---

## 11. Master data

**Menu group:** Master Data

Keep master data accurate before creating quotations and jobs. Do not create a second company record just to add another role.

### 11.1 Business Parties

**Path:** `/master-data/business-parties`

Customers, suppliers, carriers, customs brokers, and transport operators in **one** party record.

**Columns:** Party Code, Name, Roles, VAT/TIN, Contact, Phone, Email, Country, Status, Actions.

**Roles you can combine on the same party:** CUSTOMER, SUPPLIER, CARRIER, CUSTOMS_BROKER, TRANSPORT_OPERATOR.

### 11.2 Places

**Path:** `/master-data/places`

Ports, checkpoints, SEZs, warehouses, factories, and destinations used on routes.

**Columns:** Code, Name, Category, Parent, Country, Address, Status, Actions.

### 11.3 Trade Directions

**Path:** `/master-data/trade-directions`

Import, export, transit, re-export, and other service directions. Direction drives which extra job tabs appear.

**Columns:** Code, Name, Description, Status, Actions.

### 11.4 Container Types

**Path:** `/master-data/container-types`

ISO container classifications used on quotations and jobs.

**Columns:** Code, Name, Size, Kind, ISO Code, Max Gross Weight, Status, Actions.

### 11.5 Transport Types

**Path:** `/master-data/transport-types`

Road, sea, air, rail, multimodal, and similar modes.

**Columns:** Code, Name, Description, Status, Actions.

### 11.6 Transport Assets

**Path:** `/master-data/transport-assets`

Trucks, vessels, and other identified assets.

**Columns:** Asset Code, Transport Type, Identity, Identity Type, Owner, Operator, Country, Status, Actions.

### 11.7 Fee Types

**Path:** `/master-data/fee-types`

Reusable fee names used on quotation pricing and service-charge lines. Posting rules also key off fee type.

**Columns:** Code, Name, Description, Status, Actions.

---

## 12. Configuration

**Menu group:** Configuration  

Usually maintained by an implementation lead or super user, not by every operator. Changes here change **which fields appear on the job**.

### 12.1 Component Groups

**Path:** `/configuration/component-groups`

Named groups that become extra **tabs** on the service-order workspace (when enabled for a direction).

**Columns:** Code, Name, Description, Display Order, Status, Actions.

Display order controls tab order after Overview / Route / Containers.

### 12.2 Component Templates

**Path:** `/configuration/component-templates`

Versioned field definitions for a group (data type, input type, required, repeatable, reference type).

**List columns:** Code, Name, Version, Description, Attributes, Status, Actions.

**Attribute columns:** Code, Label, Data Type, Input Type, Required, Repeatable, Reference Type, Display Order, Actions.

Keep **version history**. Jobs already saved keep the template version they were captured with.

Do not build a separate Vue screen per task type. Operators fill the attributes the template defines.

### 12.3 Trade Direction Components

**Path:** `/configuration/trade-direction-components`

Which template, in which group, appears for which trade direction.

**Columns:** Trade Direction, Component Group, Template, Required, Repeatable, Display Order, Status, Actions.

This is how Import jobs can show Customs fields while Export jobs show a different set.

### 12.4 Posting Rules

**Path:** `/configuration/posting-rules`

Tells accounting which debit, credit, and tax accounts to use when a document/fee type is posted.

**Columns:** Document Type, Fee Type, Debit Account, Credit Account, Tax Account, Status, Actions.

Incomplete posting rules cause post failures or wrong accounts. Finance should review this list before go-live.

---

## 13. Administration

**Menu group:** Administration

**Standard User** sees **Users** and **Roles & Permissions** in this group (view and export). Creating, editing, or deleting users and roles still needs an administrator. The other administration pages below stay hidden unless your role includes them.

### 13.1 Organizations

**Path:** `/administration/organizations`

Legal entity, country, default currency, timezone.

**Columns:** Organization Code, Legal Name, Display Name, Country, Default Currency, Timezone, Status, Actions.

### 13.2 Branches

**Path:** `/administration/branches`

Operating locations under an organization.

**Columns:** Branch Code, Branch Name, Organization, Place, Phone, Email, Head Office, Status, Actions.

Users and documents are scoped to organization and branch.

### 13.3 Users

**Path:** `/administration/users` · `/administration/users/{id}`

**Who can open it:** Standard User (view) and Administrator (manage).

Use this page to look up colleagues: who is active, which branch they belong to, and which role they hold.

**List columns:** User Code, Username, Display Name, Email, Phone, Status, Default Branch, Last Login, Actions.

**Filters:** Search, then Status or Branch when you need a shorter list.

**What a Standard User can do**

1. Open **Administration → Users**.
2. Search by name, email, or user code.
3. Click a row (or **View** in `⋯`) to open the record.
4. Read profile fields: User Code, Username, Display Name, Email, Telegram, Organization, Branch, Role Name, Status.
5. Use **Previous / Next** in the header to walk the list.

**What only an Administrator can do**

- **New** user
- Change profile, assigned **role**, or **branch**
- Deactivate a user
- Review sessions and activity when those actions are available on the record

A user record does not grant access by itself. The **role** on that user decides which sidebar pages they see. If someone cannot open a page they need, check this list first, then open their role on **Roles & Permissions**.

### 13.4 Roles & Permissions

**Path:** `/administration/roles` · `/administration/roles/{id}`

**Who can open it:** Standard User (view) and Administrator (manage).

A role is a named set of page permissions. Every user is assigned one role. Open a role to see exactly which modules that role may view, create, edit, delete, or export.

**List columns:** Role name, Users (how many people have this role), Permissions (how many actions are granted), Status, Actions.

**How to read a role (Standard User)**

1. Open **Administration → Roles**.
2. Click a role, for example Operations or Finance.
3. On **Main information**, read Code, Role name, Status, and Description.
4. On **Permissions**, use the matrix. Each row is a module (Quotations, Service Orders, Users, …). Each column is an action:

| Action | Meaning |
|--------|---------|
| **View** | Open the list and the record |
| **Create** | Use **New** |
| **Edit** | Change a draft or active record |
| **Delete** | Remove or deactivate |
| **Export** | Download / export from that page |

A checked box means that action is allowed. Empty means the page is hidden or blocked for that role.

**Typical roles you will see**

| Role | Typical pages |
|------|----------------|
| **Operations** | Dashboard, Quotations, Service Orders, master data |
| **Finance** | Dashboard, Service Charges, Financial Documents, accounting, financial reports |
| **Standard User** | Operational pages plus **Users** and **Roles** (view only) |
| **Administrator** | All pages, including create/edit on Users and Roles |

**What only an Administrator can do**

- **New** role
- Tick or clear permission boxes
- Change role name, status, or description
- Assign a different role to a user (on the Users page)

Grant the smallest set of permissions needed for the job. Frontend hide is not security — the system still checks the role when a URL is opened.

### 13.5 Document Sequences

**Path:** `/administration/document-sequences`

Numbering by document type and year (prefix, padding, last value, next preview).

**Columns:** Document Type, Year, Prefix, Last Value, Padding, Next Number Preview, Status, Actions.

Staff must **not** invent final official numbers in a form. The sequence engine allocates them.

### 13.6 System Settings

**Path:** `/administration/system-settings`

Company-wide application settings (not a row-by-row secrets dump on the list).

Typical tabs include:

- **General** — landing page, page size, comments/sharing/export flags, max upload size
- **Localization** — language, timezone, date/time/number formats, currency
- **Email** — outbound mail; use **Test connection**
- **Telegram** — bot notifications; use **Test connection**
- **Notifications**
- **Security**
- **System**

Sensitive values stay masked. Branding (name, logo, primary color) follows these settings on every screen.

### 13.7 Audit Logs

**Path:** `/administration/audit-logs`

Who did what, when, on which record.

**Columns:** Date/Time, User, Event, Action, Entity, Organization, Branch, Result, Actions.

**Filters:** User, Event Type, Entity, Branch, Result, Date Range.

Passwords, tokens, and secrets are never shown.

---

## 14. Print preview

**Path:** `/print/{collection}/{id}`

Opened from **Print / Download** on quotations, charges, and financial documents.

What you can do:

- Review the document layout (header, lines, totals, bank and signature blocks as designed).
- Print or download from the browser.
- Return to the record when finished.

Do not treat print as posting. Printing a draft still prints a draft.

---

## 15. Sign-in and password

| Page | Path | When to use it |
|------|------|----------------|
| Login | `/auth/login` | Every session |
| Forgot password | `/auth/forget-password` | Request a reset code |
| Verify code | `/auth/verify-code` | Enter the 6-digit code |
| Reset password | `/auth/reset-password` | Set the new password |

After a successful reset, sign in with the new password.

---

## Quick reference — who uses which pages

| Role (typical) | Pages to live in |
|----------------|------------------|
| Standard User | Dashboard, Quotations, Service Orders, Service Charges, Finance, Reports, Master Data, **Users**, **Roles & Permissions** (view) |
| Sales | Dashboard, Quotations, Business Parties |
| Operations | Service Orders, Containers report, Service Order Status, Places, Container Types |
| Billing | Service Charges, Financial Documents (draft invoices) |
| Accountant | Financial Documents (post), Journals, Periods, Chart of Accounts, Financial Accounts, all Financial Reports, Posting Rules |
| Management | Dashboard, Profitability, P&L, Balance Sheet, AR/AP |
| Administrator | Users and Roles (manage), Branches, Organizations, Sequences, System Settings, Audit Logs, Configuration |

---

## Quick reference — do / don't

**Do**

- Keep parties, places, fee types, and directions up to date before quoting.
- Send quotations, then accept, then convert — in that order.
- Complete job documents on the dynamic tabs for that trade direction.
- Issue service charges for commercial billing, then create and **post** a finance invoice for accounting.
- Close accounting periods only after posting is complete.
- If a colleague cannot see a page, open **Users** then **Roles & Permissions** to confirm their role and the permission matrix.

**Don't**

- Edit a **Sent** quotation in place — create a revision.
- Convert a quotation that is not **Accepted**.
- Expect **Issue Service Charge** to update P&L or trial balance.
- Post into a **closed** period.
- Duplicate the same company as two parties for two roles.
- Type the final official document number yourself.
- Store full bank account numbers or passwords in remarks or audit-visible fields.
