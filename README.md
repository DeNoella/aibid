# AIBID: AI-Powered Business Intelligence Dashboard

AIBID is an LLM-powered business intelligence dashboard that lets non-technical users get answers from their own data. Users upload unstructured business data, then ask questions by **voice** or through a **chatbot**. The system structures the data, queries it, and returns the results in a clear, usable form.

Built as a final-year Software Engineering thesis at the Adventist University of Central Africa (AUCA), and developed for and used at **Bouletteproof Rwanda**.

---

## The Problem

Many small and medium businesses hold valuable data in messy, unstructured formats and lack the technical staff to analyse it. Traditional BI tools assume clean data and technical skills. AIBID removes both barriers: users simply ask a question in plain language and get an answer.

## Key Features

- **Natural-language querying:** ask questions in plain language instead of writing queries.
- **Voice input:** speak your question hands-free.
- **Chatbot interface:** conversational follow-up questions on your data.
- **Unstructured data ingestion:** upload raw data and let the system organise it into a queryable structure.
- **Interactive dashboard:** results presented visually for quick decision-making.
- **Authentication and user profiles:** secure access with user avatars and route protection via middleware.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend / Framework | Next.js, TypeScript, Tailwind CSS (PostCSS) |
| AI / LLM | Claude API (Anthropic) |
| Database | SQLite |
| Package manager | pnpm |
| Deployment | Docker, Nginx |

## How It Works

1. **Upload:** the user uploads unstructured data.
2. **Structure:** the LLM interprets the data and organises it into a structured, queryable form stored in SQLite.
3. **Ask:** the user asks a question by voice or chat.
4. **Answer:** the system translates the question into a query, runs it against the structured data, and returns the result on the dashboard.

Architecture diagrams are available in the [`system-diagrams`](./system-diagrams) folder.

## Project Structure

```
aibid/
├── app/                   # Next.js app routes and API endpoints
├── src/                   # Application source code and components
├── lib/                   # Shared utilities and helpers
├── docs/                  # Project documentation
├── guidelines/            # Development guidelines
├── system-diagrams/       # Architecture and system diagrams
├── aibid-test-datasets/   # Sample datasets for testing
├── public/                # Static assets and uploads
├── middleware.ts          # Route protection
├── .env.example           # Environment variable template
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- pnpm (`npm install -g pnpm`)
- An Anthropic API key

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/DeNoella/aibid.git
cd aibid

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Open .env and add your Anthropic API key and other required values

# 4. Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Try It With Sample Data

Use the files in [`aibid-test-datasets`](./aibid-test-datasets) to explore the dashboard without preparing your own data. Upload a dataset, then try questions such as:

- "What were the top-selling items last month?"
- "Which customers have the highest total spend?"
- "Show me the trend in monthly revenue."

## Deployment

AIBID is deployed with **Docker** and served behind an **Nginx** reverse proxy. Set the production environment variables, build the container image, and route traffic to the app through Nginx.

## Security Notes

- Never commit your `.env` file or API keys.
- Uploaded data is stored locally in the SQLite database; back it up regularly.
- Protected routes are enforced through `middleware.ts`.

## Roadmap

- Support for more file formats and larger datasets
- Exportable reports (PDF / Excel)
- Multilingual voice and chat, including Kinyarwanda
- Role-based access for teams

## Author

**Ange De Noella Mutesi**  
Software Engineer  
[LinkedIn](https://www.linkedin.com/in/deno%C3%ABllamutesi/) · [GitHub](https://github.com/DeNoella)

## Acknowledgements

- Adventist University of Central Africa (AUCA), thesis supervision and support
- Bouletteproof Rwanda, the client organisation this system was built for and used at
- Anthropic, for the Claude API

## License

This project was developed as an academic thesis for Bouletteproof Rwanda. Contact the author for permission before reuse.
