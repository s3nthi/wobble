import math, json
from collections import Counter

# === Feedback ===
def feedback_counts(guess, secret):
    greens, yellows = 0, 0
    secret_chars = list(secret)
    used = [False]*5

    # Greens
    for i, g in enumerate(guess):
        if g == secret[i]:
            greens += 1
            used[i] = True

    # Yellows
    for i, g in enumerate(guess):
        if g != secret[i]:
            for j in range(5):
                if not used[j] and secret[j] == g:
                    yellows += 1
                    used[j] = True
                    break
    return greens, yellows


def update_constraints(constraints, guess, secret):
    for i, g in enumerate(guess):
        if g == secret[i]:
            constraints["greens"][i] = g
        elif g in secret:
            constraints["yellows"][i].add(g)
        else:
            constraints["grays"].add(g)


# === Precompute heuristics ===
def precompute(train_words):
    # positional frequencies
    pos_freq = [{c:0 for c in 'abcdefghijklmnopqrstuvwxyz'} for _ in range(5)]
    for w in train_words:
        for i,ch in enumerate(w):
            pos_freq[i][ch] += 1

    scores1 = {}
    for w in train_words:
        s = sum(math.log(pos_freq[i][ch] + 1) for i,ch in enumerate(w))
        scores1[w] = s
    probs1_list = [w for w,_ in sorted(scores1.items(), key=lambda x:-x[1])[:10]]

    letter_counts = Counter("".join(train_words))
    scores2 = {w: sum(letter_counts[ch] for ch in w) for w in train_words}
    probs2_list = [w for w,_ in sorted(scores2.items(), key=lambda x:-x[1])[:10]]

    return probs1_list, probs2_list
