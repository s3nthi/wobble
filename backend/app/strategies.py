import random
from .utils import precompute

probs1_list, probs2_list = [], []

def init_strategies(train_words):
    global probs1_list, probs2_list
    probs1_list, probs2_list = precompute(train_words)


def random_strategy(remaining):
    return random.choice(list(remaining))


def probs1_strategy(step_idx, remaining):
        if step_idx < len(probs1_list):
            for w in probs1_list[step_idx:]:
                if w in remaining:
                    return w
        return random_strategy(remaining)


def probs2_strategy(step_idx, remaining):
        if step_idx < len(probs2_list):
            for w in probs2_list[step_idx:]:
                if w in remaining:
                    return w
        return random_strategy(remaining)


def exclude_strategy(constraints, remaining):
    cand = []
    for w in remaining:
        ok = True
        for i, g in enumerate(constraints["greens"]):
            if g and w[i] != g:
                ok = False; break
        for i, yset in enumerate(constraints["yellows"]):
            for y in yset:
                if w[i] == y or y not in w:
                    ok = False; break
        if any(c in w for c in constraints["grays"]):
            ok = False
        if ok:
            cand.append(w)
    return random.choice(cand) if cand else random_strategy(remaining)


def smart_strategy(constraints, remaining):
    letter_freq = {}
    for w in remaining:
        for ch in set(w):
            letter_freq[ch] = letter_freq.get(ch, 0) + 1

    scored = []
    for w in remaining:
        ok = True
        for i, g in enumerate(constraints["greens"]):
            if g and w[i] != g:
                ok = False; break
        for i, yset in enumerate(constraints["yellows"]):
            for y in yset:
                if w[i] == y or y not in w:
                    ok = False; break
        if any(c in w for c in constraints["grays"]):
            ok = False
        if ok:
            score = sum(letter_freq[ch] for ch in set(w)) + len(set(w))
            scored.append((score, w))
    if scored:
        scored.sort(reverse=True)
        return scored[0][1]
    return random_strategy(remaining)


ACTIONS = ["random", "probs1", "probs2", "smart", "exclude"]

def pick_word(action, step_idx, remaining, constraints):
    if action == "random": return random_strategy(remaining)
    if action == "probs1": return probs1_strategy(step_idx, remaining)
    if action == "probs2": return probs2_strategy(step_idx, remaining)
    if action == "exclude": return exclude_strategy(constraints, remaining)
    if action == "smart": return smart_strategy(constraints, remaining)
