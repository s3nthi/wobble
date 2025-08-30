import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle, json, random
from .env import WordleEnv
from .strategies import pick_word, ACTIONS, init_strategies

# === Setup Paths ===
BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")

with open(os.path.join(DATA_DIR, "train_words.json")) as f:
    train_words = json.load(f)
with open(os.path.join(DATA_DIR, "possible_words.json")) as f:
    all_words = json.load(f)

init_strategies(train_words)

MODEL_DIR = os.path.join(BASE_DIR, "models")
with open(os.path.join(MODEL_DIR, "q_table.pkl"), "rb") as f:
    Q = pickle.load(f)

# === FastAPI Setup ===
app = FastAPI()
games = {}

origins = [
    "http://localhost:4321",
    "https://wobbley.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Schemas ===
class StartRequest(BaseModel):
    secret: str | None = None

class StepRequest(BaseModel):
    game_id: str
    guess: str

class BotRequest(BaseModel):
    game_id: str

class GuessRequest(BaseModel):
    game_id: str
    guess: str


# === Endpoints ===
@app.post("/start")
def start_game(req: StartRequest):
    if req.secret is not None:
        if req.secret not in all_words:
            raise HTTPException(
                status_code=400,
                detail=f"Secret '{req.secret}' not in possible words list"
            )

    game_id = str(random.randint(1000, 9999))
    env = WordleEnv(train_words, all_words)
    state, constraints = env.reset(secret=req.secret)
    games[game_id] = {
        "env": env,
        "remaining": set(all_words),
        "step_idx": 0,
        "constraints": constraints,
        "last_counts": state
    }
    return {"game_id": game_id, "state": state, "constraints": constraints}


@app.post("/step")
def user_step(req: StepRequest):
    if req.game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[req.game_id]
    env = game["env"]
    state, reward, done, _ = env.step(req.guess)
    game["remaining"].discard(req.guess)
    game["constraints"] = state[1]
    game["last_counts"] = state[0]
    game["step_idx"] += 1

    if done:
        secret = env.secret
        del games[req.game_id]  # terminate game
        return {
            "state": state,
            "reward": reward,
            "done": True,
            "secret": secret
        }

    return {
        "state": state,
        "reward": reward,
        "done": False,
        "secret": env.secret
    }


@app.post("/bot-move")
def bot_move(req: BotRequest):
    if req.game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = games[req.game_id]
    env = game["env"]
    s = game["last_counts"]
    step_idx = game["step_idx"]

    q_vals = Q.get(s, [0.0] * len(ACTIONS))
    a_idx = max(range(len(ACTIONS)), key=lambda i: q_vals[i])
    action = ACTIONS[a_idx]

    guess = pick_word(action, step_idx, game["remaining"], game["constraints"])
    game["remaining"].discard(guess)

    state, reward, done, _ = env.step(guess)
    game["constraints"] = state[1]
    game["last_counts"] = state[0]
    game["step_idx"] += 1

    if done:
        secret = env.secret
        del games[req.game_id]  # terminate game
        return {
            "guess": guess,
            "state": state,
            "reward": reward,
            "done": True,
            "secret": secret
        }

    return {
        "guess": guess,
        "state": state,
        "reward": reward,
        "done": False,
        "secret": env.secret
    }


@app.post("/guess")
def guess_word(req: GuessRequest):
    if req.game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found")

    if req.guess not in all_words:
        raise HTTPException(
            status_code=400,
            detail=f"'{req.guess}' is not a valid word"
        )

    env = games[req.game_id]["env"]
    correct = (req.guess == env.secret)

    if correct:
        secret = env.secret
        del games[req.game_id]  # terminate if guessed correctly
        return {
            "correct": True,
            "guess": req.guess,
            "secret": secret
        }

    return {
        "correct": False,
        "guess": req.guess,
        "secret": env.secret
    }
