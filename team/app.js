const API_URL = "https://lasker-1e717f0b8782.herokuapp.com/api/chess/team-win";
const API_KEY = "dev-secret";

const MIN_ROWS = 1;
const MAX_ROWS = 12;

const rowsEl = document.getElementById("rows");
const submitBtn = document.getElementById("submitBtn");
const addBoardBtn = document.getElementById("addBoardBtn");
const outputEl = document.getElementById("output");
const errorBox = document.getElementById("errorBox");

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = "block";
}

function clearError() {
    errorBox.textContent = "";
    errorBox.style.display = "none";
}

function r2(n) {
    return Number(n).toFixed(2);
}

function pct01(x) {
    return `${r2(Number(x) * 100)}%`;
}

function updateBoardLabels() {
    const rows = rowsEl.querySelectorAll(".row");
    rows.forEach((row, idx) => {
        row.querySelector(".board-label").textContent = `Board ${idx + 1}:`;
    });
}

function clampUi() {
    const count = rowsEl.querySelectorAll(".row").length;

    addBoardBtn.disabled = count >= MAX_ROWS;

    rowsEl.querySelectorAll(".row").forEach((row) => {
        const delBtn = row.querySelector("[data-del]");
        delBtn.disabled = count <= MIN_ROWS;
    });

    updateBoardLabels();
}

function createRow(team1 = "", team2 = "") {
    const row = document.createElement("div");
    row.className = "row";

    row.innerHTML = `
    <div class="board-label">Board players:</div>

    <div class="t1">
      <input class="ecf-input" inputmode="numeric" maxlength="4" pattern="[0-9]*" placeholder="e.g. 1700" value="${team1}">
    </div>

    <div class="t2">
      <input class="ecf-input" inputmode="numeric" maxlength="4" pattern="[0-9]*" placeholder="e.g. 1800" value="${team2}">
    </div>

    <button class="remove-btn del" type="button" data-del>Remove the board</button>
  `;

    row.querySelector("[data-del]").addEventListener("click", () => {
        const count = rowsEl.querySelectorAll(".row").length;
        if (count <= MIN_ROWS) return;

        const ok = window.confirm("Remove this board?");
        if (!ok) return;

        row.remove();
        clampUi();
    });

    return row;
}

function parseRating(v) {
    const s = String(v || "").trim();
    if (s === "") return null;
    if (!/^\d+$/.test(s)) return { error: "Ratings must be integers only." };
    const n = Number(s);
    if (n < 500 || n > 3000) return { error: "Ratings must be between 500 and 3000." };
    return n;
}

function collectTeams() {
    const rows = Array.from(rowsEl.querySelectorAll(".row"));
    const team1 = [];
    const team2 = [];

    for (let i = 0; i < rows.length; i++) {
        const inputs = rows[i].querySelectorAll("input.ecf-input");
        const v1 = parseRating(inputs[0].value);
        const v2 = parseRating(inputs[1].value);

        if (v1 && v1.error) return { error: `Board ${i + 1}, Team 1: ${v1.error}` };
        if (v2 && v2.error) return { error: `Board ${i + 1}, Team 2: ${v2.error}` };

        if (v1 != null) team1.push(v1);
        if (v2 != null) team2.push(v2);
    }

    if (team1.length === 0 && team2.length === 0) {
        return { error: "Enter at least one rating." };
    }

    return { team1, team2 };
}

function renderResult(data) {
    const perBoard = data.perBoard || [];
    const s = data.summary || {};

    const lines = [];

    lines.push(`<div class="result-block-title">Match</div>`);
    lines.push(`<div class="ecf-out-row"><span class="ecf-out-label">Boards</span><span class="ecf-out-value">${data.boards}</span></div>`);
    lines.push(`<div class="ecf-out-row"><span class="ecf-out-label">Team 1 match win</span><span class="ecf-out-value">${pct01(s.team1MatchWinProbability)}</span></div>`);
    lines.push(`<div class="ecf-out-row"><span class="ecf-out-label">Team 2 match win</span><span class="ecf-out-value">${pct01(s.team2MatchWinProbability)}</span></div>`);

    lines.push(`<div style="height:10px"></div>`);
    lines.push(`<div class="result-block-title">Boards</div>`);

    perBoard.forEach((b) => {
        const t1r = b.team1Rating == null ? "missing" : b.team1Rating;
        const t2r = b.team2Rating == null ? "missing" : b.team2Rating;

        lines.push(
            `<div class="ecf-out-row"><span class="ecf-out-label">Board ${b.board} (${t1r} vs ${t2r})</span><span class="ecf-out-value">${pct01(b.team1WinProbability)}</span></div>`
        );
    });

    outputEl.innerHTML = lines.join("");
}

async function submit() {
    clearError();
    outputEl.textContent = "Calculating...";

    const collected = collectTeams();
    if (collected.error) {
        showError(collected.error);
        outputEl.textContent = "Fix input errors and submit again.";
        return;
    }

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            },
            body: JSON.stringify(collected)
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
            const msg = json && json.error ? json.error : `Request failed (${res.status})`;
            showError(msg);
            outputEl.textContent = "Request failed.";
            return;
        }

        renderResult(json);
    } catch {
        showError("Network error. Is your API running?");
        outputEl.textContent = "Request failed.";
    }
}

addBoardBtn.addEventListener("click", () => {
    if (rowsEl.querySelectorAll(".row").length >= MAX_ROWS) return;
    rowsEl.appendChild(createRow());
    clampUi();
});

submitBtn.addEventListener("click", submit);

rowsEl.appendChild(createRow());
clampUi();
