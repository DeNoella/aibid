# Dataset 3 — Contacts (JSON)

## File
`contacts.json` — array of 41 contact objects

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique contact ID (CNT-1000 to CNT-1039) |
| `name` | string | Full name (one record contains Unicode special characters) |
| `email` | string \| null | Contact email address (5% chance of null) |
| `company` | string | Company affiliation |
| `lifecycle_stage` | string | Lead, MQL, SQL, Opportunity, Customer, or Churned |
| `last_contacted` | string \| null | Date of last contact (mixed formats, 8% chance of null) |
| `tags` | array of strings | 1–4 tags per contact: enterprise, smb, hot-lead, newsletter, etc. |

## Intentional Edge Cases
- Record at index 22 is an exact duplicate of the previous record
- Record at index 15: name contains special characters (`María José Orté́ga`)
- ~5% of records have null email
- ~8% of records have null `last_contacted`
- Mixed date formats in `last_contacted`: ISO 8601, MM/DD/YYYY, ISO with time zone

## Suggested Test Queries
1. *"How many contacts are in each lifecycle stage?"*
2. *"List all contacts tagged as 'enterprise' who are in the Customer stage."*
3. *"Find contacts that have not been contacted in the last 90 days."*
4. *"Which company appears most frequently in this contact list?"*
5. *"Show me contacts with missing email addresses."*
