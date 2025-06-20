# GrowEasy Real Estate Chatbot

## Project Overview

GrowEasy is an intelligent real estate lead qualification chatbot powered by Claude AI. It conducts natural conversations with potential property buyers, asks strategic questions, and automatically classifies leads as Hot, Cold, or Invalid based on configurable business rules.

The system captures complete conversation transcripts and saves classified leads to CSV for further processing by sales teams. Built with modern web technologies, it offers both a beautiful React frontend and a robust Express backend with comprehensive error handling.

**Key Features:**
- Natural conversation flow with Claude AI
- Intelligent lead classification (Hot/Cold/Invalid)
- Configurable business rules via JSON
- Complete conversation transcript storage
- CSV export for CRM integration
- Real-time chat interface
- Comprehensive error handling

---

## How It Works

### 1. **Conversation Flow**
- User initiates chat through React frontend
- Claude AI asks strategic questions one by one
- System tracks complete conversation transcript
- Questions cover: location, property type, budget, timeline

### 2. **Lead Classification**
- After all questions answered, Claude analyzes the conversation
- Classification based on configurable rules:
  - **Hot Lead**: High budget (50+ lakhs) + immediate timeline (≤3 months)
  - **Cold Lead**: Low budget (<25 lakhs) OR distant timeline (6+ months)
  - **Invalid Lead**: Spam, incomplete answers, or nonsensical responses

### 3. **Data Persistence**
- Complete conversations saved to `leads.csv`
- Includes classification, confidence score, extracted metadata
- Full transcript preserved for review and training

### 4. **Business Intelligence**
- Structured data for sales team prioritization
- Configurable follow-up actions per lead type
- Comprehensive analytics ready format

---

## Setup Instructions

### Prerequisites
- Node.js 14+ installed
- Claude AI API key from Anthropic
- Modern web browser

### Backend Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd groweasy
npm install
```

2. **Configure environment:**
Create a `.env` file in the root directory:
```env
CLAUDE_API_KEY=your_anthropic_api_key_here
PORT=3000
```

3. **Start the backend server:**
```bash
npm start
```
Server will run on http://localhost:3000

### Frontend Setup

1. **Install React dependencies:**
```bash
cd client
npm install
```

2. **Start the frontend:**
```bash
npm start
```
Frontend will run on http://localhost:3001

### Verification

- Backend health check: GET http://localhost:3000/
- Claude API test: GET http://localhost:3000/test-claude
- Chat interface: http://localhost:3001

---

## Testing With Postman

### 1. Health Check
```
GET http://localhost:3000/
```
**Expected Response:**
```json
{
  "message": "GrowEasy Chatbot Server is running!",
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Claude API Test
```
GET http://localhost:3000/test-claude
```
**Expected Response:**
```json
{
  "success": true,
  "claude_response": "Hello! I'm Claude...",
  "model": "claude-3-5-sonnet-20241022"
}
```

### 3. Chat Endpoint
```
POST http://localhost:3000/chat
Content-Type: application/json

{
  "message": "I want to buy a property"
}
```

**Expected Response:**
```json
{
  "success": true,
  "reply": "Hello! I'm here to help you find your perfect property...",
  "isComplete": false,
  "progress": {
    "questionsAnswered": 1,
    "totalQuestions": 4
  }
}
```

### 4. Complete Conversation Test
Send messages in sequence:
1. `"I want to buy property"`
2. `"Bhubaneswar"`
3. `"Villa"`
4. `"100 lakhs"`
5. `"3 months"`

Final response will include:
```json
{
  "success": true,
  "isComplete": true,
  "classification": {
    "status": "hot",
    "confidence": 0.95,
    "reasoning": "High budget and immediate timeline"
  }
}
```

### 5. Reset Conversation
```
POST http://localhost:3000/reset
```

---

## Configuration Format

### Business Profile Structure

The `businessProfile.json` file controls all chatbot behavior:

```json
{
  "industry": "real_estate",
  "businessName": "GrowEasy Real Estate",
  "greeting": "Hello! I'm here to help you find your perfect property...",
  
  "questions": [
    {
      "id": "location",
      "text": "What location are you looking for?",
      "type": "text",
      "required": true,
      "followUp": "Great! {location} is a wonderful area."
    }
  ],
  
  "rules": {
    "hot": {
      "budgetMinLakhs": 50,
      "timelineMaxMonths": 3,
      "keywords": ["immediately", "urgent", "ready to buy"]
    },
    "cold": {
      "budgetMaxLakhs": 25,
      "timelineMinMonths": 6,
      "keywords": ["just browsing", "maybe next year"]
    },
    "invalid": {
      "keywords": ["spam", "test", "random"]
    }
  },
  
  "classification": {
    "hot": {
      "message": "Excellent! Let me connect you with our senior consultant...",
      "priority": "high",
      "followUpHours": 1
    }
  }
}
```

### Customization Options

- **Industry**: Change industry type and terminology
- **Questions**: Modify, add, or remove qualification questions
- **Rules**: Adjust classification criteria and thresholds
- **Messages**: Customize responses for each lead type
- **Keywords**: Update trigger words for classification

---

## Output Examples

### Hot Lead Example
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": "hot",
  "confidence": 0.95,
  "reasoning": "High budget (100 lakhs > 50 threshold) and immediate timeline (3 months)",
  "metadata": {
    "location": "Bhubaneswar",
    "budget": "100 lakhs",
    "timeline": "3 months",
    "propertyType": "Villa"
  },
  "transcriptLength": 10,
  "fullTranscript": "[{\"role\":\"user\",\"content\":\"I want property\"}...]"
}
```

### Cold Lead Example
```json
{
  "timestamp": "2024-01-15T11:15:00.000Z",
  "status": "cold",
  "confidence": 0.90,
  "reasoning": "Low budget (20 lakhs < 25 threshold) and distant timeline",
  "metadata": {
    "location": "Delhi",
    "budget": "20 lakhs",
    "timeline": "next year",
    "propertyType": "Plot"
  }
}
```

### Invalid Lead Example
```json
{
  "timestamp": "2024-01-15T12:00:00.000Z",
  "status": "invalid",
  "confidence": 0.95,
  "reasoning": "Nonsensical responses and spam-like behavior",
  "metadata": {
    "location": "",
    "budget": "",
    "timeline": "",
    "propertyType": ""
  }
}
```

---

## Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Anthropic Claude API** - AI conversation engine
- **dotenv** - Environment variable management
- **fs (File System)** - CSV data persistence

### Frontend
- **React.js** - User interface framework
- **CSS3** - Styling with animations and dark mode
- **Fetch API** - HTTP client for backend communication

### Development Tools
- **npm** - Package management
- **Git** - Version control
- **Cursor IDE** - Development environment

### Data Format
- **JSON** - Configuration and API communication
- **CSV** - Lead data persistence
- **Environment Variables** - Secure API key management

---

## Project Structure

```
groweasy/
├── index.js                 # Express server and main logic
├── promptBuilder.js         # Claude prompt generation
├── businessProfile.json     # Business configuration
├── leads.csv               # Output data file
├── package.json            # Backend dependencies
├── .env                    # Environment variables
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.js         # Main chat interface
│   │   ├── App.css        # Styling and animations
│   │   └── index.js       # React entry point
│   └── package.json       # Frontend dependencies
└── README.md              # This file
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check and server status |
| `/test-claude` | GET | Verify Claude API connection |
| `/chat` | POST | Main conversation endpoint |
| `/reset` | POST | Reset conversation state |

---

## Error Handling

The system includes comprehensive error handling for:
- Invalid user input (empty, too long, wrong type)
- Claude API failures (auth, rate limits, service errors)
- Network connectivity issues
- JSON parsing errors
- File system errors
- Graceful fallbacks for all failure modes

---

## Running the Complete System

### Start Backend
```bash
npm start
```

### Start Frontend
```bash
cd client
npm start
```

### Access Application
- Chat Interface: http://localhost:3001
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/

---

## License

MIT License - See LICENSE file for details.