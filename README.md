## CallFlow AI — Business Call Management Agent

CallFlow AI is an operations command center for revenue and success teams. It keeps every business call on track with live briefing intel, prioritized follow-ups, and an embedded AI agent that drafts scripts, emails, and playbooks on demand.

### Features

- **Live queue overview** with priority, owner, and contextual tags for every call.
- **Full call brief** editor with instant AI regeneration tailored to the selected contact.
- **Mission-critical task board** to keep pre-call prep and follow-ups from slipping.
- **Integrated CallFlow agent** for follow-up emails, talk tracks, debriefs, and risk analysis using your call data.

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Provide an OpenAI key so the agent can respond:
   ```bash
   export OPENAI_API_KEY=your_key
   ```
3. Run the dev server:
   ```bash
   npm run dev
   ```
4. Visit [http://localhost:3000](http://localhost:3000) to use the dashboard.

### Deployment

The app is ready for Vercel. Ensure `OPENAI_API_KEY` is configured in your project environment variables before deploying.
