# Dataset 4 — Support Tickets (JSON Lines)

## File
`support_tickets.jsonl` — 25 tickets, one JSON object per line

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `ticket_id` | string | Unique ticket ID (TKT-00001 to TKT-00025) |
| `customer` | string | Company that submitted the ticket |
| `subject` | string | Short summary of the issue |
| `body` | string | Full ticket description — ranges from 1 sentence to 4+ paragraphs |
| `priority` | string | Low, Medium, High, Critical |
| `status` | string | Open, In Progress, Pending Customer, Resolved, Closed |
| `created_at` | string | Ticket creation timestamp (mixed formats) |
| `agent_assigned` | string \| null | Support agent name (null = unassigned) |
| `tags` | array of strings | e.g. billing, bug, feature-request, integration, onboarding |

## Intentional Edge Cases
- `body` varies dramatically: some tickets are a single sentence; tickets 7–10 have 200–400 word bodies with technical detail
- `created_at` uses 3 different formats (ISO 8601, datetime without Z, DD/MM/YYYY)
- `agent_assigned` is null for ~20% of tickets (unassigned)

## Suggested Test Queries
1. *"How many tickets are Open or In Progress by priority level?"*
2. *"Which customer has submitted the most support tickets?"*
3. *"Summarize the body of the highest-priority Critical tickets."*
4. *"What are the most common tags across all tickets?"*
5. *"List all tickets tagged 'billing' with their current status."*
