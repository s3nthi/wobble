import random
from .utils import feedback_counts, update_constraints

class WordleEnv:
    def __init__(self, answers, allowed):
        self.answers = answers
        self.allowed = allowed

    def reset(self, secret=None):
        self.secret = random.choice(self.answers) if secret is None else secret
        self.turn = 0
        self.done = False
        self.constraints = {"greens":[None]*5, "yellows":[set() for _ in range(5)], "grays":set()}
        self.last_counts = (0,0)
        return self.last_counts, self.constraints

    def step(self, guess):
        self.turn += 1
        g,y = feedback_counts(guess, self.secret)
        reward = 5*g + 2*y
        if guess == self.secret:
            self.done = True
            reward += 25
        elif self.turn == 6:
            self.done = True
            reward -= 15
        update_constraints(self.constraints, guess, self.secret)
        self.last_counts = (g,y)
        return (self.last_counts, self.constraints), reward, self.done, {}
