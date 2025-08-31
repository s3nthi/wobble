import { useState, useEffect, useRef } from "react";

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

interface BotMoveResponse {
    guess: string;
    secret: string;
    done: boolean;
}

const getLetterClass = (state: LetterState) => {
    switch (state) {
        case "correct":
            return "bg-acc-green text-white";
        case "present":
            return "bg-acc-yellow text-white";
        case "absent":
            return "bg-acc-grey text-white";
        default:
            return "bg-bg border-cell-border border-2 text-fg";
    }
};

function useScaleAnimation() {
    const [scaleStates, setScaleStates] = useState<{ [key: string]: boolean }>(
        {}
    );

    const triggerScale = (key: string) => {
        setScaleStates((prev) => ({ ...prev, [key]: true }));
        setTimeout(
            () => setScaleStates((prev) => ({ ...prev, [key]: false })),
            200
        );
    };

    return { scaleStates, triggerScale };
}

function renderCell(
    ch: string,
    state: LetterState,
    scale?: boolean,
    hidden?: boolean
) {
    return (
        <div
            className={`w-12 h-12 flex items-center justify-center font-bold text-2xl uppercase transition-colors duration-300 ${getLetterClass(
                state
            )} ${scale ? "animate-scale-up" : ""}`}
        >
            {hidden ? <span className="blur-sm">?</span> : ch}
        </div>
    );
}

export default function ModeSwitcher() {
    const [mode, setMode] = useState<"play" | "test">("play");

    return (
        <>
            <div
                id="mode-switcher"
                className="my-8 mx-auto flex flex-col items-center justify-center gap-4 md:flex-row"
            >
                <label className="cursor-pointer">
                    <input
                        type="radio"
                        name="mode"
                        value=""
                        checked={mode === "play"}
                        className="sr-only peer"
                        onChange={() => setMode("play")}
                    />
                    <span className="px-6 py-2 h-10 rounded-full font-semibold transition-all duration-300 peer-checked:bg-sec-bg peer-checked:text-fg text-ter-fg peer-checked:shadow-sm">
                        Play against the bot
                    </span>
                </label>
                <label className="cursor-pointer">
                    <input
                        type="radio"
                        name="mode"
                        value="test"
                        checked={mode === "test"}
                        className="sr-only peer"
                        onChange={() => setMode("test")}
                    />
                    <span className="px-6 py-2 h-10 rounded-full font-semibold transition-all duration-300 peer-checked:bg-sec-bg peer-checked:text-fg text-ter-fg peer-checked:shadow-sm">
                        Test the bot
                    </span>
                </label>
            </div>

            <div id="mode-content" className="my-8">
                {mode === "play" && <PlayAgainstMode />}
                {mode === "test" && <TestBotMode />}
            </div>
        </>
    );
}

function PlayAgainstMode() {
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

    const { scaleStates, triggerScale } = useScaleAnimation();
    const API_URL = import.meta.env.PUBLIC_API_URL;

    useEffect(() => {
        (async () => await startGame())();
    }, []);

    useEffect(() => {
        function handleKeydown(e: KeyboardEvent) {
            if (!gameId || isGameOver || awaitingBot) return;

            if (
                /^[a-zA-Z]$/.test(e.key) &&
                userBoard[currentRow].word.length < 5
            ) {
                const newWord =
                    userBoard[currentRow].word + e.key.toLowerCase();
                updateRow(newWord);
                triggerScale(`${currentRow}-${newWord.length - 1}`);
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

    function showToast(msg: string) {
        setToast(msg);
        setTimeout(() => setToast(null), 2500);
    }

    function updateRow(word: string) {
        setUserBoard((prev) => {
            const copy = [...prev];
            copy[currentRow] = { word, colors: Array(5).fill("empty") };
            return copy;
        });
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

    async function startGame(secret?: string) {
        try {
            const res = await fetch(`${API_URL}/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(secret ? { secret } : {}),
            });
            if (!res.ok)
                return console.error("Start failed:", await res.text());

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

    async function submitGuess() {
        if (!gameId)
            return showToast("Game no longer exists"), setIsGameOver(true);
        const word = userBoard[currentRow].word;

        try {
            const res = await fetch(`${API_URL}/guess`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ game_id: gameId, guess: word }),
            });

            if (res.status === 400) return showToast("Not a valid word");
            if (res.status === 404)
                return showToast("Game no longer exists"), setIsGameOver(true);
            if (!res.ok) return console.error("Bad guess:", await res.text());

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
            } else if (currentRow >= 5) {
                setAwaitingBot(true);
                setTimeout(() => botMove(), 200);
                setIsGameOver(true);
                showToast("No one won!");
            } else {
                setCurrentRow((r) => r + 1);
                setAwaitingBot(true);
                setTimeout(() => botMove(), 200);
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
            if (!res.ok)
                return console.error("Bot move failed:", await res.text());

            const data: GuessResponse = await res.json();
            const colors = buildColors(data.guess, data.secret);

            setBotBoard((prev) => {
                const copy = [...prev];
                const idx = copy.findIndex((row) => row.word === "");
                if (idx !== -1) copy[idx] = { word: data.guess, colors };
                return copy;
            });

            if (data.done) {
                setIsGameOver(true);
                showToast("Bot wins!");
            }
        } catch (err) {
            console.error("Bot move failed:", err);
        } finally {
            setAwaitingBot(false);
        }
    }

    function renderBoard(
        board: BoardRow[],
        currentRowIdx?: number,
        hideBot?: boolean
    ) {
        return (
            <div className="flex flex-col gap-1">
                {board.map((row, i) => (
                    <div key={i} className="flex gap-1">
                        {row.colors.map((color, j) => (
                            <div key={j}>
                                {renderCell(
                                    row.word[j] || "",
                                    color,
                                    scaleStates[`${i}-${j}`] &&
                                        currentRowIdx === i,
                                    hideBot && !isGameOver && row.word !== ""
                                )}
                            </div>
                        ))}
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
        <div className="flex flex-col items-center gap-6 px-4 sm:px-0 relative">
            {gameId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 w-full max-w-4xl">
                    {toast && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg text-lg">
                                {toast}
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col items-center gap-4">
                        <h3 className="font-bold text-2xl text-center">You</h3>
                        {renderBoard(userBoard, currentRow)}
                    </div>
                    <div className="flex flex-col items-center gap-4">
                        <h3 className="font-bold text-2xl text-center">Bot</h3>
                        {renderBoard(botBoard, undefined, true)}
                    </div>
                </div>
            )}

            {isGameOver && (
                <button
                    onClick={handleRestart}
                    className="mt-4 px-4 py-2 rounded bg-sec-bg hover:bg-ter-bg text-fg border-ter-fg/20 hover:border-fg/20 border"
                >
                    Restart
                </button>
            )}
        </div>
    );
}

function TestBotMode() {
    const [gameId, setGameId] = useState<string | null>(null);
    const [board, setBoard] = useState<BoardRow[]>(
        Array(6)
            .fill(null)
            .map(() => ({ word: "", colors: Array(5).fill("empty") }))
    );
    const [moveIndex, setMoveIndex] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [secretArr, setSecretArr] = useState<string[]>(Array(5).fill(""));
    const [started, setStarted] = useState(false);

    const { scaleStates, triggerScale } = useScaleAnimation();
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const API_URL = import.meta.env.PUBLIC_API_URL;

    function showToast(msg: string) {
        setToast(msg);
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
            if (!res.ok) return showToast("Failed to start game");

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

            setTimeout(() => botGuessLoop(data.game_id, secret, 0), 500);
        } catch (err) {
            console.error(err);
            showToast("Failed to start");
        }
    }

    async function botGuessLoop(id: string, secret: string, index: number) {
        if (!id || index >= 6) return setIsGameOver(true);

        try {
            const res = await fetch(`${API_URL}/bot-move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ game_id: id }),
            });
            if (!res.ok) return showToast("Bot move failed");

            const data: BotMoveResponse = await res.json();
            const colors = buildColors(data.guess, secret);

            setBoard((prev) => {
                const copy = [...prev];
                copy[index] = { word: data.guess, colors };
                return copy;
            });
            setMoveIndex(index + 1);
            data.guess
                .split("")
                .forEach((_, i) => triggerScale(`${index}-${i}`));

            if (data.done) {
                showToast("Bot wins!");
                setIsGameOver(true);
                return;
            }

            setTimeout(() => botGuessLoop(id, secret, index + 1), 500);
        } catch (err) {
            console.error(err);
            showToast("Bot move error");
            setIsGameOver(true);
        }
    }

    function handleLetterChange(
        e: React.ChangeEvent<HTMLInputElement>,
        idx: number
    ) {
        const letter = e.currentTarget.value
            .replace(/[^a-zA-Z]/g, "")
            .toUpperCase()
            .slice(-1);
        setSecretArr((prev) => {
            const copy = [...prev];
            copy[idx] = letter;
            return copy;
        });
        if (letter && idx < 4) inputRefs.current[idx + 1]?.focus();
    }

    function handleKeyDown(
        e: React.KeyboardEvent<HTMLInputElement>,
        idx: number
    ) {
        if (e.key === "Backspace") {
            e.preventDefault();
            setSecretArr((prev) => {
                const copy = [...prev];
                if (copy[idx]) copy[idx] = "";
                else if (idx > 0) {
                    copy[idx - 1] = "";
                    inputRefs.current[idx - 1]?.focus();
                }
                return copy;
            });
        } else if (e.key === "Enter") startGame();
    }

    function renderBoard() {
        return (
            <div className="flex flex-col gap-1">
                {board.map((row, i) => (
                    <div key={i} className="flex gap-1">
                        {row.colors.map((color, j) =>
                            renderCell(
                                row.word[j] || "",
                                color,
                                scaleStates[`${i}-${j}`]
                            )
                        )}
                    </div>
                ))}
            </div>
        );
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
                    <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <input
                                key={i}
                                ref={(el) => {
                                    inputRefs.current[i] = el;
                                }}
                                value={secretArr[i] || ""}
                                onChange={(e) => {
                                    handleLetterChange(e, i);
                                    if (e.currentTarget.value)
                                        triggerScale(`input-${i}`);
                                }}
                                onKeyDown={(e) => handleKeyDown(e, i)}
                                maxLength={1}
                                className={`caret-transparent w-12 h-12 text-center text-2xl font-bold uppercase tracking-widest focus:outline-none ${
                                    scaleStates[`input-${i}`]
                                        ? "animate-scale-up"
                                        : ""
                                }`}
                                placeholder="_"
                            />
                        ))}
                    </div>
                    <button
                        onClick={startGame}
                        className="px-4 py-2 rounded bg-sec-bg hover:bg-ter-bg text-fg border-ter-fg/20 hover:border-fg/20 border"
                    >
                        Start
                    </button>
                </div>
            )}

            {started && renderBoard()}

            {isGameOver && (
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
                    className="mt-4 px-4 py-2 rounded bg-sec-bg hover:bg-ter-bg text-fg border-ter-fg/20 hover:border-fg/20 border"
                >
                    Restart
                </button>
            )}
        </div>
    );
}
