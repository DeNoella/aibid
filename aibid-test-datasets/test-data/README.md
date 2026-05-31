# AIBID Test Datasets — Master README

This package contains **5 test datasets** for validating the AIBID analytics dashboard's file parsing, chart rendering, and AI-powered Q&A capabilities. Each dataset lives in its own folder with a dedicated README.

---

## Dataset Overview

| # | Folder | File(s) | Format | Rows / Records |
|---|--------|---------|--------|----------------|
| 1 | `dataset1_csv/` | `sales_pipeline.csv` | CSV | 51 rows |
| 2 | `dataset2_xlsx/` | `marketing_campaigns.xlsx` | XLSX (2 sheets) | ~31 + ~500 rows |
| 3 | `dataset3_json/` | `contacts.json` | JSON array | 41 objects |
| 4 | `dataset4_jsonl/` | `support_tickets.jsonl` | JSON Lines | 25 objects |
| 5 | `dataset5_txt/` | `customer_notes/*.txt` + `index.csv` | Plain text + CSV | 5 docs |

---

## How to Upload Each Dataset in AIBID

### Dataset 1 — Sales Pipeline CSV
1. In AIBID, click **Upload Data** → **From File**
2. Select `dataset1_csv/sales_pipeline.csv`
3. AIBID will auto-detect column types. Verify `value_usd` is numeric and `close_date` is date.
4. If prompted about mixed date formats, choose **"Try all formats"**.

### Dataset 2 — Marketing Campaigns XLSX
1. Click **Upload Data** → **From File** → select `dataset2_xlsx/marketing_campaigns.xlsx`
2. AIBID will display both sheets — select **Campaigns** as your primary table.
3. To work with **DailyMetrics**, re-upload the same file and select the second sheet, or use AIBID's multi-sheet import if available.
4. Use `campaign_id` as the join key to link the two sheets.

### Dataset 3 — Contacts JSON
1. Click **Upload Data** → **From File** → select `dataset3_json/contacts.json`
2. AIBID should parse the top-level array automatically.
3. The `tags` field is an array — AIBID may flatten it to a comma-separated string or expand to multiple rows.

### Dataset 4 — Support Tickets JSONL
1. Click **Upload Data** → **From File** → select `dataset4_jsonl/support_tickets.jsonl`
2. If AIBID doesn't auto-detect JSONL, rename the file to `support_tickets.json` (not valid JSON — test whether AIBID handles JSONL vs strict JSON).
3. Alternatively, import as a plain-text file and test AI extraction of structured fields from `body`.

### Dataset 5 — Customer Notes (Unstructured)
1. Upload `dataset5_txt/customer_notes/index.csv` first as a structured reference table.
2. Then upload each `.txt` file individually as **Documents** or via the **Knowledge Base** / **RAG** feature if available.
3. Use the `filename` column in `index.csv` to link documents to customers and deals.

---

## Example Test Questions by Dataset

### Dataset 1 — Sales Pipeline
1. *"What is the total pipeline value by deal stage? Show as a pie chart."*
2. *"Which sales owner has the highest weighted pipeline value?"*
3. *"Show me all deals missing a close date or deal value."*

### Dataset 2 — Marketing Campaigns
1. *"Which channel had the best conversion rate in Q2 2024?"*
2. *"Plot total daily revenue across all campaigns over time."*
3. *"Which 3 campaigns had the highest spend-to-conversion ratio?"*

### Dataset 3 — Contacts
1. *"How many contacts are in each lifecycle stage? Show as a bar chart."*
2. *"List all enterprise-tagged contacts who are marked as Churned."*
3. *"Find any duplicate contact records in this dataset."*

### Dataset 4 — Support Tickets
1. *"How many tickets are open by priority level?"*
2. *"Summarize the issue described in the Critical tickets."*
3. *"Which customer has submitted the most tickets, and what are their common tags?"*

### Dataset 5 — Customer Notes
1. *"What action items are mentioned across all customer notes? WORKS"*
2. *"Which deals have security or compliance concerns based on the notes? WORKS"*
3. *"Summarize the current status of the Vertex Systems deal. WORKS"*

---

## Edge Cases Summary

| Edge Case | Where It Appears |
|-----------|-----------------|
| Missing / null values | sales_pipeline.csv rows 44–47; contacts.json ~5–8% of records |
| Duplicate rows | sales_pipeline.csv rows 50–51; marketing_campaigns.xlsx C030; contacts.json index 22 |
| Mixed date formats | sales_pipeline.csv rows 40–43; contacts.json; support_tickets.jsonl |
| Special characters in text | contacts.json (`María José Orté́ga`); support_tickets body fields |
| Long unstructured text | support_tickets.jsonl tickets 7–10; all .txt files |
| Array-type fields | contacts.json `tags[]`; support_tickets.jsonl `tags[]` |
| Multi-sheet workbook | marketing_campaigns.xlsx |
| JSONL (not JSON) format | support_tickets.jsonl |

---

*All names, companies, and contact details are entirely fictional. No real personal data is included.*
