# Project Brief: GrowEasy Claude Chatbot in Cursor

## 1. Overview
You will build **GrowEasy**, a configurable, Claude‑powered “fake WhatsApp” chat agent that:
- **Greets** incoming leads
- **Asks** a sequence of qualifying questions (location, property type, budget, timeline)
- **Classifies** each lead as **Hot**, **Cold**, or **Invalid**
- **Outputs** both the full chat transcript and a JSON classification + metadata

All logic is driven by a single **businessProfile.json** file. You’ll develop both the **backend** (Node.js + Express + Claude SDK) and a **frontend** (React + Axios), entirely inside Cursor’s environment.

## 2. Objectives
- **MVP in 3 days**: by Day 3 you must have a working end‑to‑end prototype
- **Config‑driven**: swapping to a new industry (e.g. car sales) is as simple as replacing the JSON
- **Deliverables**: GitHub repo, README, sample I/O, config template, demo video, email template

## 3. Core Functionality
1. **Chat Simulation**  
   - Text‑only chat UI (feel‑like WhatsApp)
   - Endpoint(s) that accept incoming messages and return bot replies
2. **Question Loop**  
   - Dynamically read questions from `businessProfile.json`
   - Send each to Claude, collect user answers
3. **Classification**  
   - After all answers, call Claude again with transcript + `rules` to get `{ status, metadata }`
4. **Persistence**  
   - Log each conversation + classification to `leads.csv`
   - (Optional) Postman‑friendly API endpoints to trigger or inspect data

## 4. Inputs & Outputs

| Input                             | Source                          |
|-----------------------------------|---------------------------------|
| Lead Info (name, phone, source)   | Chat UI or CLI or Postman call |
| Initial Message (optional)        | Same as above                   |
| Business Profile (questions, rules) | `businessProfile.json`          |

| Output                            | Destination                     |
|-----------------------------------|---------------------------------|
| Chat Transcript (array of Q&A)    | JSON file / in‑memory / UI      |
| Final Classification & Metadata   | Response payload & `leads.csv`  |

## 5. Technology Stack
- **Language:** JavaScript (Node.js)  
- **LLM:** Anthropic Claude 2 via `@anthropic-ai/sdk`  
- **Server:** Express  
- **Client:** React + Axios (within Cursor)  
- **Config:** `businessProfile.json` (JSON file)  
- **Persistence:** Flat file CSV (via `fs`)  
- **Environment:** Cursor IDE (terminal, file browser, integrated runner)

## 6. Folder Structure
/
├── businessProfile.json # questions + rules
├── index.js # Express + Claude endpoints
├── promptBuilder.js # buildPrompt & buildClassificationPrompt
├── test-claude.js # standalone Claude smoke test
├── leads.csv # output log
├── client/ # React app
│ └── src/App.js # chat UI + Axios calls
└── README.md # setup, running, config, examples
└── examples/ # hot.json, cold.json, invalid.json
└── docs/
└── email-template.md # prewritten submission email

## 7. Milestones & Timeline
- **Day 1:**  
  - Set up Node.js project & Cursor workspace  
  - Install deps (`express`, `@anthropic-ai/sdk`, `dotenv`)  
  - Create `businessProfile.json`  
  - Build `promptBuilder.js` & test in REPL  
  - Spin up Express `/chat` endpoint & Claude “hello” call
- **Day 2:**  
  - Scaffold React client, wire to `/chat`  
  - Extend prompt logic for classification  
  - Track transcript, parse classification JSON  
  - Persist to `leads.csv`  
  - Test three lead scenarios (Hot, Cold, Invalid)
- **Day 3:**  
  - Add robust error handling (`try/catch`, input validation)  
  - Write `README.md` and populate `examples/`  
  - Draft and record 2–3 min demo video (Loom)  
  - Prepare `docs/email-template.md` and push all commits  

## 8. Success Criteria
- **Functional demo:** end‑to‑end chat → classification → CSV logging  
- **Configurable:** change industry/questions/rules via JSON alone  
- **Documentation:** clear README, examples folder, email template  
- **Professional polish:** CLI/Postman usage documented, demo video under 3 min

---