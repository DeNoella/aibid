# AIBID Test Datasets — Bouletteproof Rwanda
## Demo Question Guide

This folder contains 5 datasets representing real-world data from **Bouletteproof Rwanda**, a 200-person AI analytics company headquartered in Kigali. Use these datasets to demonstrate the AIBID platform's Voice Control and AI Assistant capabilities.

### How to use
1. Go to **Dashboard → Voice Query** section
2. Upload a dataset file using the file drop zone
3. Click **Start Voice Control** and ask a question below
4. OR go to **AI Assistant** and attach a file, then type or speak your question

---

## Dataset 1 — Workforce Analytics
**File:** `test-data/dataset1_csv/bouletteproof_workforce_analytics.csv`
**Format:** CSV · 200 rows · 22 columns
**About:** Full HR dataset — employees, salaries (RWF), performance scores, training hours, departments, locations, nationalities

### Voice Control Questions
Speak these naturally after uploading the file:
1. *"How many employees does Bouletteproof have?"*
2. *"What is the average salary in the Engineering department?"*
3. *"Which department has the highest average performance score?"*
4. *"How many female employees work in Data Science?"*
5. *"Show me all employees based in Kigali HQ"*
6. *"What is the total monthly salary spend in Rwandan Francs?"*
7. *"How many employees are currently on probation?"*
8. *"Which employees have been here more than 3 years?"*
9. *"Show me employees who resigned"*
10. *"What is the average training hours by department?"*

### AI Assistant Questions
Type or speak these for deeper analysis:
1. *"Which departments are at highest attrition risk based on performance scores and tenure?"*
2. *"Generate a gender pay equity analysis — are male and female employees paid the same for equivalent roles?"*
3. *"Which managers have the best-performing teams on average?"*
4. *"Identify employees who might be flight risks based on low performance and high sick days"*
5. *"Is there a correlation between training hours and performance score?"*
6. *"Create a diversity report by nationality, gender, and location"*
7. *"Compare average salaries across all 10 departments and highlight the gap"*
8. *"Who are the top 10 highest-earning employees and what do they have in common?"*
9. *"Which locations outside Kigali HQ have the most employees?"*
10. *"Show me the distribution of education levels across the company"*

---

## Dataset 2 — Financial Performance
**File:** `test-data/dataset2_xlsx/bouletteproof_financial_performance.csv`
**Format:** CSV · 80 rows · 28 columns
**About:** Quarterly P&L by product line (2021–2024) — revenue, margins, ARR, MRR, clients, CAC, LTV, burn rate, NPS across 5 product lines and 4 years

### Voice Control Questions
1. *"What was total revenue in Q3 2024?"*
2. *"Which product line generated the most revenue overall?"*
3. *"What is the current monthly recurring revenue for the AIBID Platform?"*
4. *"How many new clients were acquired in Q1 2024?"*
5. *"What is the gross margin for Custom AI Solutions?"*
6. *"Show me revenue growth year over year from 2021 to 2024"*
7. *"What is the LTV to CAC ratio for Training and Academy?"*
8. *"Which quarter had the highest EBITDA?"*
9. *"How many total active clients do we have in Q3 2024?"*
10. *"What was the average NPS score across all product lines in 2023?"*

### AI Assistant Questions
1. *"Compare profitability across all five product lines over the full 4-year period"*
2. *"Which product line has improved its gross margin the most since 2021?"*
3. *"Analyse the trend in customer acquisition cost — is it getting cheaper or more expensive?"*
4. *"Which region is growing the fastest and should receive the most investment?"*
5. *"What is the relationship between headcount and revenue per employee over time?"*
6. *"Which product line has the best LTV to CAC ratio and why does it matter?"*
7. *"Project Q4 2024 revenue for each product line based on growth trajectories"*
8. *"Identify the quarters where EBITDA margin exceeded 60% and what drove that"*
9. *"Compare Q1 2021 vs Q3 2024 — how has the business transformed?"*
10. *"Build a summary of all key financial milestones from 2021 to 2024"*

---

## Dataset 3 — Client Portfolio
**File:** `test-data/dataset3_json/bouletteproof_client_portfolio.json`
**Format:** JSON · 35 client objects · nested fields
**About:** Complete client portfolio — contract values, KPIs (NPS, adoption rate, delivery), renewal dates, risk flags, upsell opportunities, sector breakdown across 12 countries

### Voice Control Questions
1. *"How many active clients do we have?"*
2. *"What is the total contract value of all government sector clients?"*
3. *"Which client has the highest NPS score?"*
4. *"How many clients are at risk of churning?"*
5. *"What is the average user adoption rate across all clients?"*
6. *"Which country has the most clients?"*
7. *"Show me all clients with a renewal probability below 80%"*
8. *"What is the total monthly value of all active contracts?"*
9. *"Which sector generates the most total contract value?"*
10. *"How many clients have data quality risk flags?"*

### AI Assistant Questions
1. *"Which clients are at highest risk of non-renewal — rank them by risk based on NPS, adoption rate, and renewal date"*
2. *"Analyse our client concentration risk — are we over-dependent on any single sector or country?"*
3. *"Which sectors generate the most total contract value and where should we focus business development?"*
4. *"Create a client health scorecard ranking all clients from healthiest to most at-risk"*
5. *"What are the top 5 upsell opportunities across the portfolio by estimated value?"*
6. *"Summarise all risk flags across the portfolio and recommend actions"*
7. *"Which clients have the highest total lifetime value and what made those relationships successful?"*
8. *"Compare government clients vs commercial clients on NPS, adoption, and renewal probability"*
9. *"Which account managers have the highest-performing portfolios on average?"*
10. *"Identify clients where on-time delivery is below 90% and analyse the pattern"*

---

## Dataset 4 — Field Operations Reports
**File:** `test-data/dataset4_jsonl/bouletteproof_field_reports.jsonl`
**Format:** JSON Lines · 20 reports · long narrative text + structured fields
**About:** Field officer visit reports across Rwanda — agriculture, health, finance, government, tourism sectors. Includes narratives, GPS coordinates, beneficiary counts, recommendations, sentiment

### Voice Control Questions
1. *"How many field reports were submitted in 2024?"*
2. *"Which region has the most field activity?"*
3. *"How many total beneficiaries were reached across all field reports?"*
4. *"What percentage of reports flagged data quality issues?"*
5. *"Which field officer submitted the most reports?"*
6. *"How many reports have follow-up required?"*
7. *"Which sector had the most field visits?"*
8. *"How many reports had a very positive sentiment?"*
9. *"How many photos were taken across all field visits?"*
10. *"Which district had the most field reports?"*

### AI Assistant Questions
1. *"Summarise the top 5 recurring issues identified across all field reports"*
2. *"Which field activities produced the most positive outcomes and what can we learn from them?"*
3. *"What are the most frequently requested product improvements mentioned by field officers?"*
4. *"Analyse the sentiment across all reports — which districts show the most challenges?"*
5. *"Extract all pending follow-up actions and group them by responsible person or team"*
6. *"Which sectors are underserved by the current field coverage and need more visits?"*
7. *"Summarise all recommendations made by field officers and group them by theme"*
8. *"What does the data say about rural connectivity challenges and how is AIBID responding?"*
9. *"Which single field visit had the highest strategic impact and why?"*
10. *"Compare the early 2024 field reports vs more recent ones — is the sentiment improving?"*

---

## Dataset 5 — Strategic Documents
**Files:** `test-data/dataset5_txt/bouletteproof_strategy/`
- `board_meeting_q1_2024.txt` — Board of Directors meeting minutes, Q1 2024
- `market_analysis_east_africa_2024.txt` — East Africa AI market analysis report
- `annual_strategy_review_2023.txt` — CEO annual strategy memo and 2024 planning

**Format:** Unstructured text · rich narrative content
**Best used with:** AI Assistant (paste or upload text content)

### AI Assistant Questions — Board Minutes
1. *"Summarise the key decisions made in the Q1 2024 board meeting"*
2. *"What was the company's financial performance in Q1 2024?"*
3. *"What is the MTN Group deal and why is it described as critical?"*
4. *"Extract all action items from the board meeting with their owners and deadlines"*
5. *"What were the top risks identified and what are the mitigation plans?"*
6. *"What did the board say about IPO preparation?"*
7. *"Who attended the board meeting and what role does each person play?"*
8. *"What salary decisions were made for employees at the board meeting?"*

### AI Assistant Questions — Market Analysis
1. *"What is the Total Addressable Market for AI analytics in East Africa by 2028?"*
2. *"Who are Bouletteproof's main competitors and what are their weaknesses?"*
3. *"What are the top 5 growth drivers for the East Africa analytics market?"*
4. *"What competitive advantages does Bouletteproof have over Microsoft Power BI and Tableau?"*
5. *"What are the three biggest strategic opportunities identified in the market analysis?"*
6. *"What is the 2026 market share target and what would it take to achieve it?"*
7. *"Which market segment is growing the fastest and why?"*

### AI Assistant Questions — Annual Strategy Review
1. *"What were the top 3 things that worked well in 2023?"*
2. *"What failed or underperformed in 2023 and what lessons were learned?"*
3. *"What are the 7 strategic priorities for 2024 and who owns each one?"*
4. *"What does the CEO say about Bouletteproof's company culture?"*
5. *"What is the 2024 revenue target and what are the key assumptions behind it?"*
6. *"What is the MSME strategy and why was it delayed in 2023?"*
7. *"Why does the CEO say the open-source Kinyarwanda NLP release is a strategic move?"*
8. *"How does the CEO describe the urgency of what Bouletteproof is doing?"*

---

## Power Demo Sequence (impress an audience in 5 minutes)

**Step 1 — Upload workforce data, then say:**
> *"How many female employees do we have in Data Science and what is their average performance score?"*

**Step 2 — Upload financial data, then say:**
> *"Which product line has grown its revenue the most from 2021 to 2024?"*

**Step 3 — Upload client portfolio JSON, then ask AI Assistant:**
> *"Which of our clients are most at risk of churning and what should we do about it?"*

**Step 4 — Paste board minutes into AI Assistant, then ask:**
> *"What are the most important decisions from this board meeting?"*

**Step 5 — Upload field reports, then say:**
> *"What are the biggest product gaps that field officers keep mentioning?"*

---

*All datasets are fictional but based on realistic Bouletteproof Rwanda scenarios. Generated for AIBID platform demonstration purposes.*
