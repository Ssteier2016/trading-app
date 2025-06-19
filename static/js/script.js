async function fetchPrices() {
    const response = await fetch("/prices");
    const data = await response.json();
    const crypto = document.getElementById("crypto").value;
    const currency = document.getElementById("currency").value;
    document.getElementById("price").innerText = `${data[crypto][currency]} ${currency}`;
}

document.getElementById("operation-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
        user: "user@example.com",
        fecha: document.getElementById("fecha").value,
        tipo: document.getElementById("tipo").value,
        crypto: document.getElementById("crypto").value,
        monto: document.getElementById("monto").value,
        comision: document.getElementById("comision").value
    };
    if (!navigator.onLine) {
        localStorage.setItem("pending", JSON.stringify([...JSON.parse(localStorage.getItem("pending") || "[]"), data]));
        alert("Operación guardada localmente");
    } else {
        await fetch("/operations", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data)});
        alert("Operación guardada");
    }
});

document.getElementById("binance-api-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
        apiKey: document.getElementById("api-key").value,
        apiSecret: document.getElementById("api-secret").value
    };
    await fetch("/save-binance-api", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    });
    alert("Claves guardadas");
});

document.getElementById("toggle-auto").addEventListener("click", async () => {
    const response = await fetch("/toggle-auto", {method: "POST"});
    const status = await response.json();
    document.getElementById("toggle-auto").innerText = status.active ? "Desactivar Automatización" : "Activar Automatización";
});

document.getElementById("time-range").addEventListener("change", async () => {
    const response = await fetch("/graph-data");
    const data = await response.json();
    const ctx = document.getElementById("profitChart").getContext("2d");
    new Chart(ctx, {type: "line", data: {labels: data.map(item => item.date), datasets: [{label: "Ganancias/Pérdidas", data: data.map(item => item.profit)}]}});
});

fetchPrices();
