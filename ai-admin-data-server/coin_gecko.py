import requests
import pandas as pd

# Ví dụ: Lấy giá real-time cho Bitcoin và Ethereum
coins = 'bitcoin,ethereum'  # Thêm coin khác
url = f'https://api.coingecko.com/api/v3/simple/price?ids={coins}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true'

response = requests.get(url, timeout=20)
response.raise_for_status()
data = response.json()

# Xử lý thành DataFrame
df = pd.DataFrame.from_dict(data, orient='index')
df.reset_index(inplace=True)
df.rename(columns={'index': 'Coin'}, inplace=True)

# Lưu vào CSV
df.to_csv('./data/coingecko_crypto_data.csv', index=False)
print('Dữ liệu đã lưu vào coingecko_crypto_data.csv')
print(df)

# Lấy historical data cho Bitcoin (7 ngày) và lưu riêng
historical_url = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7'
hist_response = requests.get(historical_url, timeout=20)
hist_response.raise_for_status()
hist_data = hist_response.json()

hist_df = pd.DataFrame(hist_data['prices'], columns=['Timestamp', 'Price'])
hist_df['Date'] = pd.to_datetime(hist_df['Timestamp'], unit='ms')  # Chuyển timestamp sang date
hist_df.drop('Timestamp', axis=1, inplace=True)

hist_df.to_csv('./data/coingecko_bitcoin_historical.csv', index=False)
print('Dữ liệu lịch sử đã lưu vào coingecko_bitcoin_historical.csv')
print(hist_df.head())
