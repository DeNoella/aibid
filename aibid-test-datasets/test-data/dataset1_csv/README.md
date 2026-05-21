# Dataset 1 — Sales Pipeline (CSV)

## File
`sales_pipeline.csv` — 51 data rows + 1 header

## Columns

| Column | Type | Description |
|--------|------|-------------|
| `deal_name` | string | Name of the sales deal |
| `company` | string | Account/company name |
| `stage` | string | Pipeline stage: Discovery, Proposal, Negotiation, Closed Won, Closed Lost |
| `value_usd` | number | Deal value in US dollars |
| `close_date` | date | Expected or actual close date |
| `owner` | string | Sales rep assigned to the deal |
| `probability` | integer | Win probability (0–100%) |

## Intentional Edge Cases
- **Rows 44–46** (`Ruby Insurance`, `Sapphire Mining`, `Titan Automotive`): missing `value_usd`, `close_date`, or both
- **Row 47** (`Willow Financial`): missing `owner`
- **Rows 50–51** (`Apex Tech Expansion`): exact duplicate rows
- **Rows 40–43** (`Nova Robotics`, `Opal Hospitality`, `Quartz Architecture`): mixed date formats (`01/15/2025`, `08-10-2024`, `May 3 2024`)

## Suggested Test Queries
1. *"What is the total pipeline value by stage?"*
2. *"Show me a bar chart of deal count per sales owner."*
3. *"Which deals have a missing close date or value?"*
4. *"What is the weighted pipeline value using the probability column?"*
5. *"List all Closed Won deals sorted by value descending."*
