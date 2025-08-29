<div align="center">
<h1>Wobble – RL Wordle™ Solver</h1>
</div>
Wobble is a Reinforcement Learning project that trains an agent to play Wordle™. It includes:

It includes:

* **Backend**: Q-learning RL agent + FastAPI API.
* **Frontend**: Astro web UI for testing the bot in your browser.

## Project Structure

```
backend/   - Environment, RL agent, API server
frontend/  - Astro-based web interface
models/    - Saved Q-learing models (Q table)
data/      - Word lists
```

## How It Works

1. The backend trains an RL agent to guess words based on feedback similar to Wordle™.
2. The trained model serves predictions via a REST API.
3. The frontend lets users play or get suggestions from the bot.

**Note:**

* No official Wordle™ code, data, or other resources are used.
* All training is done locally with custom word lists and environments.

*Wordle is a trademark of The New York Times Company. This project is not affiliated with or endorsed by The New York Times Company.*
