# Dataset 5 — Customer Notes (Unstructured Text Bundle)

## Folder Structure
```
customer_notes/
├── index.csv                              ← structured manifest
├── note_acme_corp_2024_03.txt            ← QBR meeting notes
├── note_vertex_systems_2024_05.txt       ← Deal negotiation call summary
├── note_northstar_health_2024_06.txt     ← Email thread summary
├── note_quicksilver_payments_2024_07.txt ← Negotiation check-in
└── note_ironclad_security_2024_06.txt    ← Technical review notes
```

## index.csv Fields

| Column | Description |
|--------|-------------|
| `filename` | Name of the .txt file |
| `customer_name` | Company the note relates to |
| `date` | Date of meeting/call/thread |
| `topic` | Short description of the note's content |
| `associated_deal_stage` | Pipeline stage of the deal at time of note |
| `owner` | Sales rep responsible |

## Text File Formats
Each `.txt` file follows one of three formats:
- **Meeting Notes**: Structured agenda + discussion + action items
- **Call Summary**: Narrative summary with key points and next steps
- **Email Thread**: Reconstructed email chain with sender/date/content

## Suggested Test Queries
1. *"Which customers have open action items from their notes?"*
2. *"Summarize the key risk factors mentioned across all deal notes."*
3. *"What security or compliance concerns have customers raised?"*
4. *"Which deals are most likely to close based on the negotiation notes?"*
5. *"Extract all action items assigned to Morgan Lee from the notes."*
