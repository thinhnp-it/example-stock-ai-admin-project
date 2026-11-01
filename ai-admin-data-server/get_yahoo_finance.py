import yfinance as yf
import pandas as pd

# Symbol thay thế cho VN-Index: '0P0000HY8X.VN'
symbol = '0P0000HY8X.VN'  # Hoặc thử '^VNINDEX.VN' nếu bạn muốn test lại

# Lấy dữ liệu lịch sử (sử dụng period='1y' để lấy 1 năm qua, tránh lỗi với dates xa)
data = yf.download(symbol, period='1y')  # Hoặc dùng start='2025-01-01', end='2026-03-03' nếu cần khoảng cụ thể

if not data.empty:
    # Lưu vào CSV
    data.to_csv('./data/yahoo_finance_vnindex_data.csv')
    print('Dữ liệu đã lưu vào yahoo_finance_vnindex_data.csv')
    print(data.tail())  # In 5 dòng cuối để xem dữ liệu gần nhất
    
    # Lấy giá real-time với xử lý lỗi
    ticker = yf.Ticker(symbol)
    history = ticker.history(period='1d')
    if not history.empty:
        current_price = history['Close'].iloc[-1]
        print(f'Giá hiện tại của {symbol}: {current_price}')
    else:
        print(f'Không có dữ liệu real-time cho {symbol}. Kiểm tra kết nối hoặc symbol.')
else:
    print(f'Không có dữ liệu lịch sử cho {symbol}. Thử symbol khác hoặc kiểm tra yfinance version.')