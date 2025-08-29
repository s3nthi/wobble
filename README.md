<div align="center">
<h1>Wobble – RL Wordle™ Solver</h1>
</div>
Wobble is a Reinforcement Learning project that trains an agent to play Wordle™. It includes:

- **Backend**: Q-learning agent + FastAPI REST API  
- **Frontend**: Astro-based web interface to interact with the bot  

## Project Structure

```
backend/   - Environment, Q-learning agent, API server  
frontend/  - Astro-based web interface  
models/    - Saved Q-learning models (Q-table)  
data/      - Word lists used for training and guessing  
```

## How It Works

Wobble is powered by a reinforcement learning agent trained to solve Wordle-like puzzles using a simplified Q-learning algorithm.

### Backend – Q-Learning Agent + API

- The backend trains a **Q-learning agent** to guess 5-letter words based on feedback similar to *Wordle™*.
- The agent interacts with a custom environment (`WordleEnv`) where:
  - **State**: A tuple representing feedback from the previous guess — the number of correct letters in the correct position (**greens**) and correct letters in the wrong position (**yellows**).
  - **Actions**: A set of predefined word-picking strategies (e.g. frequency-based, position-based, constraint-filtered).
  - **Reward**: Positive points for accurate guesses (greens/yellows), a bonus for solving the word, and penalties for failure after 6 attempts.
- The agent is trained over thousands of episodes, updating its **Q-table** using the Q-learning formula:

  ```
  Q[s][a] ← Q[s][a] + α * (reward + γ * max(Q[s’]) − Q[s][a])
  ```

- Once training is complete:
  - The **Q-table** is saved to `models/q_table.pkl`.
  - A **FastAPI** app serves this model via a REST API.

#### API Capabilities

- `POST /start`: Start a new game with an optional secret word.
- `POST /step`: Submit a user's guess and get feedback.
- `POST /bot-move`: Request the bot to make the next guess using the learned Q-values and current constraints.


### Frontend – Astro Web Interface

- The frontend is built with **Astro**, offering an interactive Wordle-style UI.
- Users can:
  - Play the game manually by entering guesses.
  - Let the bot take over and observe its strategy in action.
- The interface communicates with the FastAPI backend to manage game state and display feedback in real time.


## Installation

> **Requirements**:
> - Python 3.10+
> - Node.js (for frontend)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```


## Training the Agent

To train the Q-learning agent from scratch:

```bash
cd backend
python app/train.py
```

This will train the agent using custom word lists and save the Q-table to `models/q_table.pkl`.


## API Usage (Example)

Start the backend server:

```bash
uvicorn app.main:app --reload
```

Then use an API tool (like Postman or cURL):

- **Start a game**:
  ```http
  POST /start
  {
    "secret": "crane"  // optional
  }
  ```

- **Submit a guess**:
  ```http
  POST /step
  {
    "game_id": "1234",
    "guess": "slate"
  }
  ```

- **Bot makes a move**:
  ```http
  POST /bot-move
  {
    "game_id": "1234"
  }
  ```


**Note:**

* No official Wordle™ code, data, or other resources are used.
* All training is done locally with custom word lists and environments.

*Wordle is a trademark of The New York Times Company. This project is not affiliated with or endorsed by The New York Times Company.*
