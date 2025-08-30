import { useState, useEffect } from "react";

type LetterState = "correct" | "present" | "absent" | "empty";

interface GuessResponse {
    correct: boolean;
    guess: string;
    secret: string;
    done?: boolean;
}

interface BoardRow {
    word: string;
    colors: LetterState[];
}

export default function PlayAgainst() {
    const [gameId, setGameId] = useState<string | null>(null);
    const [userBoard, setUserBoard] = useState<BoardRow[]>(
        Array(6)
            .fill(null)
            .map(() => ({ word: "", colors: Array(5).fill("empty") }))
    );
    const [botBoard, setBotBoard] = useState<BoardRow[]>(
        Array(6)
            .fill(null)
            .map(() => ({ word: "", colors: Array(5).fill("empty") }))
    );
    const [currentRow, setCurrentRow] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [awaitingBot, setAwaitingBot] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const API_URL = import.meta.env.PUBLIC_API_URL;

    useEffect(() => {
        startGame();
    }, []);

    useEffect(() => {
        function handleKeydown(e: KeyboardEvent) {
            if (!gameId || isGameOver || awaitingBot) return;

            if (
                /^[a-zA-Z]$/.test(e.key) &&
                userBoard[currentRow].word.length < 5
            ) {
                updateRow(userBoard[currentRow].word + e.key.toLowerCase());
            } else if (e.key === "Backspace") {
                updateRow(userBoard[currentRow].word.slice(0, -1));
            } else if (
                e.key === "Enter" &&
                userBoard[currentRow].word.length === 5
            ) {
                e.preventDefault();
                submitGuess();
            }
        }

        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [gameId, currentRow, userBoard, isGameOver, awaitingBot]);

    function showToast(message: string) {
        setToast(message);
        setTimeout(() => setToast(null), 2500);
    }

    function updateRow(word: string) {
        setUserBoard((prev) => {
            const copy = [...prev];
            copy[currentRow] = { word, colors: Array(5).fill("empty") };
            return copy;
        });
    }

    async function startGame(secret?: string) {
        try {
            const res = await fetch(`${API_URL}/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(secret ? { secret } : {}),
            });

            if (!res.ok) {
                console.error("Start failed:", await res.text());
                return;
            }

            const data = await res.json();
            setGameId(data.game_id);
            setUserBoard(
                Array(6)
                    .fill(null)
                    .map(() => ({ word: "", colors: Array(5).fill("empty") }))
            );
            setBotBoard(
                Array(6)
                    .fill(null)
                    .map(() => ({ word: "", colors: Array(5).fill("empty") }))
            );
            setCurrentRow(0);
            setIsGameOver(false);
            setAwaitingBot(false);
        } catch (err) {
            console.error("Start game failed:", err);
        }
    }

    function buildColors(guess: string, secret: string): LetterState[] {
        const colors: LetterState[] = Array(5).fill("absent");
        const secretArr = secret.split("");
        const guessArr = guess.split("");

        guessArr.forEach((ch, i) => {
            if (ch === secretArr[i]) {
                colors[i] = "correct";
                secretArr[i] = "#";
                guessArr[i] = "_";
            }
        });

        guessArr.forEach((ch, i) => {
            if (ch === "_" || colors[i] === "correct") return;
            const idx = secretArr.indexOf(ch);
            if (idx !== -1) {
                colors[i] = "present";
                secretArr[idx] = "#";
            }
        });

        return colors;
    }

    async function submitGuess() {
        if (!gameId) {
            showToast("Game no longer exists");
            setIsGameOver(true);
            return;
        }

        const word = userBoard[currentRow].word;

        try {
            const res = await fetch(`${API_URL}/guess`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ game_id: gameId, guess: word }),
            });

            if (res.status === 400) {
                showToast("Not a valid word");
                return;
            }

            if (res.status === 404) {
                showToast("Game no longer exists");
                setIsGameOver(true);
                return;
            }

            if (!res.ok) {
                console.error("Bad guess:", await res.text());
                return;
            }

            const data: GuessResponse = await res.json();
            const colors = buildColors(data.guess, data.secret);

            setUserBoard((prev) => {
                const copy = [...prev];
                copy[currentRow] = { word: data.guess, colors };
                return copy;
            });

            if (data.correct) {
                setIsGameOver(true);
                showToast("You win!");
            } else if (currentRow + 1 >= 6) {
                setIsGameOver(true);
                showToast("No one won!");
            } else {
                setCurrentRow((r) => r + 1);
                setAwaitingBot(true);
                botMove();
            }
        } catch (err) {
            console.error("Submit guess failed:", err);
        }
    }

    async function botMove() {
        if (!gameId) return;

        try {
            const res = await fetch(`${API_URL}/bot-move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ game_id: gameId }),
            });

            if (!res.ok) {
                console.error("Bot move failed:", await res.text());
                setAwaitingBot(false);
                return;
            }

            const data: GuessResponse = await res.json();
            const colors = buildColors(data.guess, data.secret);

            setBotBoard((prev) => {
                const copy = [...prev];
                const idx = copy.findIndex((row) => row.word === "");
                if (idx !== -1) {
                    copy[idx] = { word: data.guess, colors };
                }
                return copy;
            });

            if (data.done) {
                setIsGameOver(true);
                showToast("Bot wins!");
            } else if (currentRow >= 6) {
                setIsGameOver(true);
                showToast("No one won!");
            }
        } catch (err) {
            console.error("Bot move failed:", err);
        } finally {
            setAwaitingBot(false);
        }
    }

    function renderCell(ch: string, state: LetterState, hidden?: boolean) {
        const bg =
            state === "correct"
                ? "bg-acc-green"
                : state === "present"
                ? "bg-acc-yellow"
                : state === "absent"
                ? "bg-acc-grey"
                : "bg-acc-grey";

        return (
            <div
                className={`w-12 h-12 flex items-center justify-center font-bold text-xl uppercase ${bg} text-white`}
            >
                {hidden ? <span className="blur-sm">?</span> : ch}
            </div>
        );
    }

    function renderBoard(board: BoardRow[], hideLetters: boolean) {
        return (
            <div className="flex flex-col gap-2">
                {board.map((row, i) => (
                    <div key={i} className="flex gap-2">
                        {Array.from({ length: 5 }).map((_, j) =>
                            renderCell(
                                row.word[j] || "",
                                row.colors[j],
                                hideLetters && !isGameOver && row.word !== ""
                            )
                        )}
                    </div>
                ))}
            </div>
        );
    }

    function handleRestart() {
        setGameId(null);
        setUserBoard(
            Array(6)
                .fill(null)
                .map(() => ({ word: "", colors: Array(5).fill("empty") }))
        );
        setBotBoard(
            Array(6)
                .fill(null)
                .map(() => ({ word: "", colors: Array(5).fill("empty") }))
        );
        setCurrentRow(0);
        setIsGameOver(false);
        setAwaitingBot(false);
        startGame();
    }

    return (
        <div className="flex flex-col items-center gap-6">
            {gameId && (
                <div className="relative grid grid-cols-2 gap-10 w-full max-w-4xl">
                    {toast && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg text-lg">
                                {toast}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col items-center gap-4">
                        <h3 className="font-bold text-2xl text-center">You</h3>
                        {renderBoard(userBoard, false)}
                        {!isGameOver && (
                            <p className="text-sm text-gray-500">
                                Type letters + Enter to submit
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <h3 className="font-bold text-2xl text-center">Bot</h3>
                        {renderBoard(botBoard, true)}
                    </div>
                </div>
            )}

            {isGameOver && (
                <button
                    onClick={handleRestart}
                    className="group px-4 py-2 rounded bg-sec-bg hover:bg-ter-bg text-fg border-ter-fg/20 hover:border-fg/20 border"
                >
                    Restart
                    
                </button>
            )}
        </div>
    );
}
