from flask import Flask, jsonify, request, render_template
from decimal import Decimal, getcontext
import requests
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from binance.client import Client
from binance.enums import *

app = Flask(__name__)
getcontext().prec = 18  # 18 decimales

# Configuración de Google Sheets
scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
creds = ServiceAccountCredentials.from_json_keyfile_name("credentials.json", scope)
client = gspread.authorize(creds)
sheet = client.open("TradingApp").sheet1

# Almacenar claves Binance (temporal, usar .env en producción)
binance_keys = {}
auto_trading = False

# Obtener precios de CoinGecko
def get_crypto_prices():
    url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana&vs_currencies=usd,ars"
    response = requests.get(url).json()
    return response

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/prices", methods=["GET"])
def prices():
    return jsonify(get_crypto_prices())

@app.route("/operations", methods=["POST"])
def add_operation():
    data = request.json
    monto = Decimal(data["monto"])
    comision = Decimal(data["comision"])
    sheet.append_row([data["user"], data["fecha"], data["tipo"], data["crypto"], str(monto), str(comision)])
    return jsonify({"status": "success"})

@app.route("/graph-data", methods=["GET"])
def graph_data():
    operations = sheet.get_all_records()
    data = [{"date": op["fecha"], "profit": float(Decimal(op.get("ganancia", 0)))} for op in operations]
    return jsonify(data)

@app.route("/save-binance-api", methods=["POST"])
def save_binance_api():
    data = request.json
    user = "user@example.com"  # Placeholder
    binance_keys[user] = {"api_key": data["apiKey"], "api_secret": data["apiSecret"]}
    return jsonify({"status": "success"})

@app.route("/toggle-auto", methods=["POST"])
def toggle_auto():
    global auto_trading
    auto_trading = not auto_trading
    if auto_trading:
        user = "user@example.com"  # Placeholder
        if user in binance_keys:
            client = Client(binance_keys[user]["api_key"], binance_keys[user]["api_secret"])
            try:
                order = client.create_order(
                    symbol="BTCUSDT",
                    side=SIDE_BUY,
                    type=ORDER_TYPE_MARKET,
                    quantity=0.001
                )
                sheet.append_row([user, order["updateTime"], "compra", "bitcoin", str(order["origQty"]), str(order["commission"])])
            except Exception as e:
                print(f"Error en orden: {e}")
    return jsonify({"active": auto_trading})

if __name__ == "__main__":
    app.run(debug=True)
