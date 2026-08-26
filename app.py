from flask import Flask, jsonify, render_template, request
import requests

app = Flask(__name__)

BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/price"


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/price")
def price():
    """Proxy live spot price lookups to Binance so the browser avoids CORS issues."""
    symbol = request.args.get("symbol", "").strip().upper()
    if not symbol:
        return jsonify({"error": "missing symbol"}), 400

    try:
        response = requests.get(BINANCE_TICKER_URL, params={"symbol": symbol}, timeout=5)
    except requests.RequestException:
        return jsonify({"error": "upstream request failed"}), 502

    if response.status_code != 200:
        return jsonify({"error": "symbol not found"}), 404

    data = response.json()
    try:
        return jsonify({"symbol": data["symbol"], "price": float(data["price"])})
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "unexpected upstream response"}), 502


if __name__ == "__main__":
    app.run(debug=True)
