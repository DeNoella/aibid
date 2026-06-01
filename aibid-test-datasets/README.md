# AIBID Test Datasets — Bouletteproof Rwanda
## Complete Feature Demo & Question Guide

Five datasets from **Bouletteproof Rwanda** (a 200-person AI analytics company in Kigali). Every question below is verified to work with the current system. Upload a file, then ask.

**Supported file types:** `.csv` · `.xlsx` · `.json` · `.jsonl`

---

## How the two AI features behave (read this first)

**🎙️ Voice Control** (Dashboard → Voice Query)
- **No file loaded** → spoken phrases act as *dashboard commands* (change views, focus metrics, refresh).
- **File loaded** → *every* spoken phrase is treated as a **question about your data** and is answered from the file with an answer + table + chart. The four dashboard cards update from the answer.

**💬 AI Assistant** (AI Assistant page)
- Always answers your typed/spoken question from the attached file.
- Remembers the conversation in the same session, keeps the file loaded for follow-ups, and saves every chat under **Chat History**.

> Tip for grouped comparisons: phrase them as **"average X by Y"** or **"compare X across Y"** (not "which Y has the highest X"). The answer already tells you the highest and lowest.

---

## ✅ Feature Showcase — one question per feature

| Feature | Upload | Ask this |
|---|---|---|
| Voice dashboard command | *(no file)* | "Show revenue" / "Switch to monthly view" / "Refresh" |
| Voice data question + chart | Dataset 1 | "What is the average salary by department?" |
| Auto **bar** chart (comparison) | Dataset 1 | "Compare average performance score across departments" |
| Auto **line** chart (trend) | Dataset 2 | "Show the revenue trend by year" |
| Auto **pie** chart (distribution) | Dataset 1 | "What is the distribution of employees by education level?" |
| Dashboard **Revenue** card reacts | Dataset 2 | "What is the total revenue by region?" |
| Dashboard **Active Clients** card reacts | Dataset 2 | "How many active clients are there in total?" |
| AI Assistant + follow-up memory | Dataset 1 | "Average salary by department" → then "Which one is lowest?" |
| Chat history | Dataset 1 | Ask anything, then open the **Chat History** tab |

---

## Dataset 1 — Workforce Analytics
**File:** `test-data/dataset1_csv/bouletteproof_workforce_analytics.csv` · CSV · 200 rows
**Key columns:** department, job_title, status, location, gender, age_group, education_level, nationality, base_salary_rwf, performance_score_2024, training_hours_ytd, years_at_bp, sick_days_2024, active_projects

### Counts & distributions (→ pie / bar)
1. "How many employees are there in each department?"
2. "What is the distribution of employees by gender?"
3. "What is the distribution of employees by education level?"
4. "How many employees are in each location?"
5. "How many employees are there in each nationality?"

### Averages & comparisons (→ bar)
6. "What is the average salary by department?"
7. "Compare average performance score across departments"
8. "What is the average training hours by department?"
9. "What is the average salary by education level?"

### Totals
10. "What is the total salary spend across the company?"
11. "What is the total training hours by department?"

### Top / ranking
12. "Top 10 employees by salary"
13. "Top 5 employees by performance score"
14. "Top 5 employees by training hours"

### Filters
15. "Which employees have a performance score above 4.5?"
16. "Which employees have more than 50 training hours?"
17. "Which employees are in the Engineering department?"
18. "List employees based in Musanze"
19. "List employees with the status resigned"

### Correlation
20. "Is there a correlation between training hours and performance score?"

---

## Dataset 2 — Financial Performance
**File:** `test-data/dataset2_xlsx/bouletteproof_financial_performance.csv` · CSV · 80 rows
**Key columns:** year, quarter, month, product_line, region, revenue_usd, gross_profit_usd, gross_margin_pct, ebitda_usd, net_income_usd, new_clients, active_clients, arr_usd, mrr_usd, nps_score, cac_usd, ltv_usd, ltv_cac_ratio

> In Voice Control these work because once a file is loaded, words like "revenue"/"year" are treated as part of your question, not dashboard commands.

### Trends over time (→ line)
1. "Show the revenue trend by year"
2. "What is the total revenue by quarter?"
3. "Show the EBITDA trend by year"

### Comparisons (→ bar)
4. "Compare total revenue across product lines"
5. "What is the total revenue by region?"
6. "What is the average gross margin by product line?"
7. "Compare average NPS score across product lines"
8. "What is the average LTV to CAC ratio by product line?"

### Totals & counts
9. "What is the total revenue across all records?"
10. "How many active clients are there in total?"
11. "What is the total number of new clients by year?"

### Top / ranking & filters
12. "Top 5 records by revenue"
13. "Which records have revenue above 1000000?"
14. "Which records have a gross margin above 80?"

---

## Dataset 3 — Client Portfolio
**File:** `test-data/dataset3_json/bouletteproof_client_portfolio.json` · JSON · 35 clients
**Queryable columns:** sector, country, status, partnership_type, account_manager, contract_value_usd, monthly_value_usd, renewal_probability_pct, total_lifetime_value_usd, organization, short_name

### Counts & distributions (→ pie / bar)
1. "How many clients are in each sector?"
2. "What is the distribution of clients by country?"
3. "What is the distribution of clients by status?"
4. "How many clients does each account manager handle?"

### Totals & averages
5. "What is the total contract value by sector?"
6. "What is the total monthly value by sector?"
7. "What is the average contract value by sector?"
8. "Compare total lifetime value across sectors"

### Top / ranking & filters
9. "Top 5 clients by contract value"
10. "Top 5 clients by total lifetime value"
11. "Which clients have a renewal probability below 80?"
12. "Which clients have a contract value above 400000?"

---

## Dataset 4 — Field Operations Reports
**File:** `test-data/dataset4_jsonl/bouletteproof_field_reports.jsonl` · JSON Lines · 20 reports
**Queryable columns:** region, district, sector, field_officer, supervisor, sentiment, activity_type, beneficiary_count, photos_taken

### Counts & distributions
1. "How many reports are there for each region?"
2. "How many field reports did each field officer submit?"
3. "What is the distribution of reports by sentiment?"
4. "How many reports are there per sector?"
5. "How many reports are there per district?"

### Totals & comparisons
6. "What is the total number of beneficiaries by region?"
7. "What is the total beneficiaries by sector?"
8. "What is the total photos taken by region?"
9. "What is the average beneficiary count by sector?"

### Top / ranking & filters
10. "Top 5 reports by beneficiary count"
11. "Which reports reached more than 100 beneficiaries?"

---

## Dataset 5 — Strategy Document Index
**File:** `test-data/dataset5_txt/bouletteproof_strategy/index.csv` · CSV · document catalogue
**Queryable columns:** document_type, classification, author, date, title

1. "How many documents are there of each type?"
2. "What is the distribution of documents by classification?"
3. "How many documents did each author write?"

> The full strategy write-ups (`board_meeting_q1_2024.txt`, `market_analysis_east_africa_2024.txt`, `annual_strategy_review_2023.txt`) are reference reading. The **index.csv** above is the queryable dataset.

---

## 🎙️ Voice Control — Dashboard Commands (use with NO file loaded)

These control the dashboard itself:
- "Show revenue" · "Show campaign analytics" · "Show profit" · "Show cost"
- "Switch to weekly view" · "Show monthly view" · "Show quarterly data"
- "Refresh the dashboard"
- "Export the data"
- "Reset"

---

## 30-Second Demo Script

1. **Voice command:** with no file, say *"Show revenue"* → dashboard reacts.
2. **Upload Dataset 1**, start voice, ask *"What is the average salary by department?"* → spoken answer + bar chart; ask again *"What is the distribution of employees by gender?"* → pie chart. (Proves follow-up questions work without refreshing.)
3. **Upload Dataset 2** in the AI Assistant, ask *"Show the revenue trend by year"* → line chart + table, **Revenue MTD** card updates. Follow up *"How many active clients are there in total?"* → **Active Clients** card updates.
4. Open **Chat History** → your conversation is saved and re-openable.

*All datasets are fictional, built for AIBID demonstration.*
