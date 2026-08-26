const QUOTE_SUFFIXES = ["USDT", "FDUSD", "BUSD", "USDC", "USD"];

const els = {
    sideBadge: document.getElementById("side-badge"),
    symbolInput: document.getElementById("symbol-input"),
    contractLabel: document.getElementById("contract-label"),
    leverageInput: document.getElementById("leverage-input"),
    liveIndicator: document.getElementById("live-indicator"),
    pnlUnit: document.getElementById("pnl-unit"),
    pnlValue: document.getElementById("pnl-value"),
    roiValue: document.getElementById("roi-value"),
    qtyInput: document.getElementById("qty-input"),
    marginInput: document.getElementById("margin-input"),
    marginUnit: document.querySelector(".margin-unit"),
    entryInput: document.getElementById("entry-input"),
    markPrice: document.getElementById("mark-price"),
    liqPrice: document.getElementById("liq-price"),
    statusLine: document.getElementById("status-line"),
};

const state = {
    side: "long",
    markPrice: null,
    pollHandle: null,
};

function baseAsset(symbol) {
    const upper = symbol.trim().toUpperCase();
    for (const suffix of QUOTE_SUFFIXES) {
        if (upper.endsWith(suffix) && upper.length > suffix.length) {
            return upper.slice(0, -suffix.length);
        }
    }
    return upper;
}

function formatNumber(value, decimals) {
    if (!Number.isFinite(value)) return "—";
    return value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function priceDecimals(price) {
    if (!Number.isFinite(price) || price === 0) return 2;
    if (price >= 1000) return 2;
    if (price >= 1) return 3;
    return 6;
}

function setSign(el, value) {
    el.classList.remove("positive", "negative", "neutral");
    if (value > 0) el.classList.add("positive");
    else if (value < 0) el.classList.add("negative");
    else el.classList.add("neutral");
}

function recalculate() {
    const entry = parseFloat(els.entryInput.value);
    const qty = parseFloat(els.qtyInput.value);
    const margin = parseFloat(els.marginInput.value);
    const leverage = parseFloat(els.leverageInput.value);
    const mark = state.markPrice;

    const asset = baseAsset(els.symbolInput.value);
    els.pnlUnit.textContent = asset || "—";
    els.marginUnit.textContent = asset || "—";

    if (Number.isFinite(mark)) {
        els.markPrice.textContent = formatNumber(mark, priceDecimals(mark));
    } else {
        els.markPrice.textContent = "—";
    }

    if (!Number.isFinite(entry) || !Number.isFinite(qty) || !Number.isFinite(mark)) {
        els.pnlValue.textContent = "—";
        els.roiValue.textContent = "—";
        els.liqPrice.textContent = "—";
        return;
    }

    const direction = state.side === "long" ? 1 : -1;
    const pnl = (mark - entry) * qty * direction;
    els.pnlValue.textContent = formatNumber(pnl, 4);
    setSign(els.pnlValue, pnl);

    if (Number.isFinite(margin) && margin > 0) {
        const roi = (pnl / margin) * 100;
        els.roiValue.textContent = `${formatNumber(roi, 2)}%`;
        setSign(els.roiValue, roi);
    } else {
        els.roiValue.textContent = "—";
        els.roiValue.classList.remove("positive", "negative", "neutral");
    }

    if (Number.isFinite(leverage) && leverage > 0) {
        const distance = entry / leverage;
        const liq = state.side === "long" ? entry - distance : entry + distance;
        els.liqPrice.textContent = formatNumber(Math.max(liq, 0), priceDecimals(liq));
    } else {
        els.liqPrice.textContent = "—";
    }
}

function setStatus(message, isError = false) {
    els.statusLine.textContent = message;
    els.statusLine.style.color = isError ? "var(--red)" : "var(--text-dim)";
}

async function fetchMarkPrice() {
    const symbol = els.symbolInput.value.trim().toUpperCase();
    if (!symbol) return;
    try {
        const response = await fetch(`/api/price?symbol=${encodeURIComponent(symbol)}`);
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "error desconocido");
        }
        state.markPrice = data.price;
        els.liveIndicator.textContent = "● en vivo";
        els.liveIndicator.style.color = "var(--green)";
        setStatus(`Última actualización: ${new Date().toLocaleTimeString("es-AR")}`);
    } catch (err) {
        state.markPrice = null;
        els.liveIndicator.textContent = "● sin datos";
        els.liveIndicator.style.color = "var(--red)";
        setStatus(`No se pudo obtener el precio de ${symbol}: ${err.message}`, true);
    }
    recalculate();
}

function restartPolling() {
    if (state.pollHandle) clearInterval(state.pollHandle);
    fetchMarkPrice();
    state.pollHandle = setInterval(fetchMarkPrice, 5000);
}

els.sideBadge.addEventListener("click", () => {
    state.side = state.side === "long" ? "short" : "long";
    els.sideBadge.textContent = state.side === "long" ? "B" : "S";
    els.sideBadge.classList.toggle("short", state.side === "short");
    recalculate();
});

els.symbolInput.addEventListener("change", restartPolling);
els.symbolInput.addEventListener("blur", restartPolling);

[els.leverageInput, els.qtyInput, els.marginInput, els.entryInput].forEach((el) => {
    el.addEventListener("input", recalculate);
});

restartPolling();
