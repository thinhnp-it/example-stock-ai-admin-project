import requests
import pandas as pd
import os
from dotenv import load_dotenv
import time

load_dotenv()

# Thay bằng API key của bạn
API_KEY = os.getenv("FINHUB_API_KEY")

# Ví dụ: Lấy historical candle data cho AAPL (daily resolution, 1 năm qua)
symbol = 'AAPL'
resolution = 'D'  # D: daily, 1: 1 phút, 5: 5 phút, v.v.
to_time = int(time.time())  # Thời gian hiện tại (Unix)
from_time = to_time - (365 * 24 * 60 * 60)  # 1 năm trước

url = f'https://finnhub.io/api/v1/stock/candle?symbol={symbol}&resolution={resolution}&from={from_time}&to={to_time}&token={API_KEY}'

response = requests.get(url, timeout=20)
response.raise_for_status()
data = response.json()

if 'c' in data and data['s'] == 'ok':  # Kiểm tra dữ liệu hợp lệ
    df = pd.DataFrame({
        'Date': pd.to_datetime(data['t'], unit='s'),  # Chuyển timestamp sang date
        'Open': data['o'],
        'High': data['h'],
        'Low': data['l'],
        'Close': data['c'],
        'Volume': data['v']
    })
    
    # Lưu vào CSV
    df.to_csv('finnhub_stock_historical.csv', index=False)
    print('Dữ liệu lịch sử đã lưu vào finnhub_stock_historical.csv')
    print(f'Số dòng dữ liệu: {len(df)}')
    print(df.head())  # In 5 dòng đầu
else:
    print('Lỗi: Kiểm tra API key, symbol, hoặc giới hạn free tier.')
