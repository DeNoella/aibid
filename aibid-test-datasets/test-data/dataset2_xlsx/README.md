# Dataset 2 — Marketing Campaigns (XLSX)

## File
`marketing_campaigns.xlsx` — 2 sheets

## Sheet: Campaigns (~31 rows including 1 duplicate)

| Column | Type | Description |
|--------|------|-------------|
| `campaign_id` | string | Unique campaign identifier (C001–C030) |
| `campaign_name` | string | Descriptive name of the campaign |
| `channel` | string | e.g. Social Media, Email, Paid Search, Display, Webinar, Affiliate, Video, Audio, Event, Content |
| `spend` | number | Total spend in USD (null for some organic/content campaigns) |
| `impressions` | number | Total impressions (null for email and events) |
| `clicks` | number | Total clicks (null for some campaigns) |
| `conversions` | number | Conversion count (null for some campaigns) |
| `start_date` | date | Campaign start date (mixed formats: YYYY-MM-DD, DD/MM/YYYY, "Month D YYYY") |
| `end_date` | date | Campaign end date |
| `status` | string | Completed, Active, Planned |

## Sheet: DailyMetrics (~500 rows)

| Column | Type | Description |
|--------|------|-------------|
| `date` | date | Day of record |
| `campaign_id` | string | Links to Campaigns.campaign_id |
| `impressions_daily` | number | Impressions for that day |
| `clicks_daily` | number | Clicks for that day |
| `conversions_daily` | number | Conversions for that day |
| `revenue` | number | Revenue attributed for that day |

## Intentional Edge Cases
- Row C030 duplicated (same campaign_id twice)
- Some campaigns have NULL impressions/clicks (email-only channels)
- Mixed date formats in `start_date`/`end_date` columns
- Campaign C029 has all NULL metric columns

## Suggested Test Queries
1. *"Which channel has the highest total conversions?"*
2. *"Plot daily revenue over time for campaign C006."*
3. *"What is the average cost-per-click by channel?"*
4. *"Show me the top 5 campaigns by ROI (revenue / spend)."*
5. *"How many campaigns are currently active vs completed?"*
