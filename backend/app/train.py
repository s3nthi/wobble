import os
import random
import pickle
import json
from collections import defaultdict
from .env import WordleEnv
from .strategies import pick_word, ACTIONS, init_strategies

alpha, gamma = 0.1, 0.1
epsilon = 0.05

def train_model():
    BASE_DIR = os.path.dirname(__file__)
    DATA_DIR = os.path.join(BASE_DIR, "data")

    with open(os.path.join(DATA_DIR, "train_words.json")) as f:
        train_words = json.load(f)
    with open(os.path.join(DATA_DIR, "possible_words.json")) as f:
        all_words = json.load(f)

    init_strategies(train_words)

    Q = defaultdict(lambda: [0.0] * len(ACTIONS))
    env = WordleEnv(train_words, all_words)

    episodes = 200000
    print_every = 500
    total_reward, wins = 0, 0

    for episode in range(1, episodes + 1):
        (g_last, y_last), constraints = env.reset()
        remaining = set(all_words)
        step_idx, done = 0, False
        ep_reward = 0

        while not done:
            s = (g_last, y_last)
            if random.random() < epsilon:
                a_idx = random.randrange(len(ACTIONS))
            else:
                a_idx = max(range(len(ACTIONS)), key=lambda i: Q[s][i])
            action = ACTIONS[a_idx]
            guess = pick_word(action, step_idx, remaining, constraints)
            remaining.discard(guess)

            (next_counts, next_constraints), reward, done, _ = env.step(guess)
            g_next, y_next = next_counts
            s_next = (g_next, y_next)

            Q[s][a_idx] += alpha * (
                reward + (0 if done else gamma * max(Q[s_next])) - Q[s][a_idx]
            )

            g_last, y_last = g_next, y_next
            step_idx += 1
            ep_reward += reward

        total_reward += ep_reward
        if guess == env.secret:
            wins += 1

        if episode % print_every == 0:
            avg_reward = total_reward / print_every
            win_rate = wins / print_every * 100
            print(
                f"Episode {episode}: avg reward={avg_reward:.2f}, win rate={win_rate:.1f}%"
            )
            total_reward, wins = 0, 0

    models_dir = os.path.join(BASE_DIR, "models")
    os.makedirs(models_dir, exist_ok=True)

    model_path = os.path.join(models_dir, "q_table.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(dict(Q), f)

    print(f"Training complete. Q-table saved to {model_path}")


if __name__ == "__main__":
    train_model() 
