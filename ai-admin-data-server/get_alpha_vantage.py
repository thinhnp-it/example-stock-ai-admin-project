import requests
import pandas as pd
import os 
from dotenv import load_dotenv

load_dotenv()

# Thay bằng API key của bạn
API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")

# Ví dụ: Lấy dữ liệu lịch sử giá cổ phiếu (daily) cho mã AAPL
symbol = 'NVDA'  # Thay bằng mã bạn muốn
url = f'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&apikey={API_KEY}'

response = requests.get(url, timeout=20)
response.raise_for_status()
data = response.json()

# Xử lý dữ liệu thành DataFrame
if 'Time Series (Daily)' in data:
    df = pd.DataFrame.from_dict(data['Time Series (Daily)'], orient='index')
    df.index.name = 'Date'
    df.columns = ['Open', 'High', 'Low', 'Close', 'Volume']  # Đổi tên cột cho rõ
    df = df.astype(float)  # Chuyển sang số
    df["Name"] = symbol
    df.reset_index(inplace=True)  # Thêm cột Date
    
    # Lưu vào CSV
    df.to_csv(f'./data/{symbol}_stock_data.csv', index=False)
    print(f'Dữ liệu đã lưu vào {symbol}_stock_data.csv')
    print(df.head())  # In preview
else:
    print('Lỗi: Kiểm tra API key hoặc symbol.')
