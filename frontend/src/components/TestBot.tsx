import { useState, useRef } from "react";

type LetterState = "correct" | "present" | "absent" | "empty";

interface BotMoveResponse {
    guess: string;
    secret: string;
    done: boolean;
}

interface BoardRow {
    word: string;
    colors: LetterState[];
}

export default function TestBot() {
    const [gameId, setGameId] = useState<string | null>(null);
    const [board, setBoard] = useState<BoardRow[]>(() =>
        Array(6)
            .fill(null)
            .map(() => ({ word: "", colors: Array(5).fill("empty") }))
    );
    const [moveIndex, setMoveIndex] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [secretArr, setSecretArr] = useState<string[]>(Array(5).fill(""));
    const [started, setStarted] = useState(false);

    const API_URL = import.meta.env.PUBLIC_API_URL;
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

    function showToast(message: string) {
        setToast(message);
        setTimeout(() => setToast(null), 2000);
    }

    function buildColors(guess: string, secret: string): LetterState[] {
        const colors: LetterState[] = Array(5).fill("absent");
        const secretArrLocal = secret.split("");
        const guessArr = guess.split("");

        guessArr.forEach((ch, i) => {
            if (ch === secretArrLocal[i]) {
                colors[i] = "correct";
                secretArrLocal[i] = "#";
                guessArr[i] = "_";
            }
        });

        guessArr.forEach((ch, i) => {
            if (ch === "_" || colors[i] === "correct") return;
            const idx = secretArrLocal.indexOf(ch);
            if (idx !== -1) {
                colors[i] = "present";
                secretArrLocal[idx] = "#";
            }
        });

        return colors;
    }

    async function startGame() {
        const secret = secretArr.join("").toLowerCase();
        if (secret.length !== 5 || !/^[a-z]{5}$/.test(secret)) {
            showToast("Secret must be 5 letters");
            return;
        }

        try {
            const res = await fetch(`${API_URL}/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ secret }),
            });

            if (!res.ok) {
                const text = await res.text();
                console.error("Start failed:", text);
                showToast("Failed to start game");
                return;
            }

            const data = await res.json();
            setGameId(data.game_id);
            setBoard(
                Array(6)
                    .fill(null)
                    .map(() => ({ word: "", colors: Array(5).fill("empty") }))
            );
            setMoveIndex(0);
            setIsGameOver(false);
            setStarted(true);
            setSecretArr(Array(5).fill(""));

            setTimeout(() => botGuessLoop(data.game_id, secret, 0), 500);
        } catch (err) {
            console.error("Start game failed:", err);
            showToast("Failed to start");
        }
    }

    async function botGuessLoop(
        id: string | null,
        secret: string,
        index: number
    ) {
        if (!id) {
            console.warn("Game ID not found, stopping bot loop");
            setIsGameOver(true);
            return;
        }

        if (index > 6) {
            showToast("Bot failed!");
            setIsGameOver(true);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/bot-move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ game_id: id }),
            });

            if (!res.ok) {
                const text = await res.text();
                console.error("Bot move failed:", text);
                showToast("Bot move failed");
                setIsGameOver(true);
                return;
            }

            const data: BotMoveResponse = await res.json();

            if (!data || !data.guess) {
                console.warn("Game deleted on server, stopping bot loop");
                setIsGameOver(true);
                return;
            }

            const colors = buildColors(data.guess, secret);

            setBoard((prev) => {
                const copy = [...prev];
                copy[index] = { word: data.guess, colors };
                return copy;
            });
            setMoveIndex(index + 1);

            if (data.done) {
                showToast("Bot wins!");
                setIsGameOver(true);
                return;
            }

            setTimeout(() => botGuessLoop(id, secret, index + 1), 500);
        } catch (err) {
            console.error("Bot move failed:", err);
            showToast("Bot move error");
            setIsGameOver(true);
        }
    }

    function renderCell(ch: string, state: LetterState) {
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
                {ch}
            </div>
        );
    }

    function renderBoard() {
        return (
            <div className="flex flex-col gap-2">
                {board.map((row, i) => (
                    <div key={i} className="flex gap-2">
                        {Array.from({ length: 5 }).map((_, j) =>
                            renderCell(row.word[j] || "", row.colors[j])
                        )}
                    </div>
                ))}
            </div>
        );
    }

    function handleLetterChange(
        e: React.ChangeEvent<HTMLInputElement>,
        idx: number
    ) {
        const raw = e.currentTarget.value || "";
        const letter = raw
            .replace(/[^a-zA-Z]/g, "")
            .toUpperCase()
            .slice(-1);
        setSecretArr((prev) => {
            const copy = [...prev];
            copy[idx] = letter;
            return copy;
        });
        if (letter && idx < 4) {
            inputRefs.current[idx + 1]?.focus();
        }
    }

    function handleKeyDown(
        e: React.KeyboardEvent<HTMLInputElement>,
        idx: number
    ) {
        if (e.key === "Backspace") {
            e.preventDefault();
            setSecretArr((prev) => {
                const copy = [...prev];
                if (copy[idx]) {
                    copy[idx] = "";
                } else if (idx > 0) {
                    copy[idx - 1] = "";
                    inputRefs.current[idx - 1]?.focus();
                }
                return copy;
            });
        } else if (e.key === "Enter") {
            const secret = secretArr.join("").toLowerCase();
            if (secret.length === 5 && /^[a-z]{5}$/.test(secret)) {
                startGame();
            } else {
                showToast("Secret must be 5 letters");
            }
        }
    }

    return (
        <div className="flex flex-col items-center gap-6 relative">
            {toast && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg text-lg">
                        {toast}
                    </div>
                </div>
            )}

            {!started && (
                <div className="flex flex-col items-center gap-4">
                    <div className="flex gap-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <input
                                key={i}
                                ref={(el) => {
                                    if (el) inputRefs.current[i] = el;
                                }}
                                value={secretArr[i] || ""}
                                onChange={(e) => handleLetterChange(e, i)}
                                onKeyDown={(e) => handleKeyDown(e, i)}
                                maxLength={1}
                                className="w-12 h-12 text-center text-xl font-bold uppercase tracking-widest focus:outline-none"
                                inputMode="text"
                                placeholder="_"
                            />
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={startGame}
                            className="px-4 py-2 rounded bg-sec-bg hover:bg-ter-bg text-fg border-ter-fg/20 hover:border-fg/20 border"
                        >
                            Start
                        </button>
                    </div>
                </div>
            )}

            {started && renderBoard()}

            {isGameOver && (
                <div className="mt-4">
                    <button
                        onClick={() => {
                            setStarted(false);
                            setBoard(
                                Array(6)
                                    .fill(null)
                                    .map(() => ({
                                        word: "",
                                        colors: Array(5).fill("empty"),
                                    }))
                            );
                            setGameId(null);
                            setIsGameOver(false);
                            setSecretArr(Array(5).fill(""));
                            setMoveIndex(0);
                            inputRefs.current[0]?.focus();
                        }}
                        className="px-4 py-2 rounded bg-sec-bg hover:bg-ter-bg text-fg border-ter-fg/20 hover:border-fg/20 border"
                    >
                        Restart
                    </button>
                </div>
            )}
        </div>
    );
}
