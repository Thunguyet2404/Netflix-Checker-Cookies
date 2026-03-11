# Netflix Checker Cookies

Công cụ tự động kiểm tra tài khoản Netflix hàng loạt dựa trên file định dạng `.txt` Netscape Cookie. Code được thiết kế tối ưu, tự động lọc accounts theo thông tin Live/Dead/Bad/Unknown cùng các chỉ số: Email, Gói Cước (Plan), Quốc Gia, Ngày thanh toán (Billing Date) và Số dư/Profiles.

| Developer | [Hiếu Trung Nguyễn (Github)](https://github.com/Thunguyet2404) |
| :--- | :--- |
| **Telegram** | [t.me/hieunguyen2907](https://t.me/hieunguyen2907) |

## Mục lục

- [Tính năng](#-tính-năng)
- [Yêu cầu](#-yêu-cầu)
- [Cách sử dụng](#-cách-sử-dụng)
- [Bản quyền](#-bản-quyền)

## Tính năng

Công cụ này hỗ trợ mạnh mẽ qua việc Check từ Cookies của tài khoản Netflix, giúp hạn chế bị chặn (block/checkpoint) so với hình thức Combo User:Pass.

| Tính năng | Mô tả |
| :--- | :--- |
| **Hỗ Trợ Windows Diags** | Giao diện Box pop-up chọn thư mục chứa File `.txt` thân thiện với người dùng |
| **Multi-thread Speed** | Tính năng đa luồng tự điều chỉnh cho tốc độ Check nhanh mượt, tiết kiệm thời gian |
| **Lọc Netscape Cookie** | Tự động parse định dạng Netscape Cookie từ thư mục thành Cookie chuẩn HTTP Header lưu Session |
| **Export Status** | Hoạt động phân loại theo tình trạng Live, Dead, Bad, Unknown |
| **Export Profile** | Phân loại ghi đè vào thư mục `results/` với số liệu từng Account (Bao gồm Plan Premium, Standard) | 

## Yêu cầu

- Máy chạy hệ điều hành Windows.
- [Node.js](https://nodejs.org/) (Version 16.0+ trở lên khuyến nghị)
- Python (Trình chọn Folder `tkinter` sẽ gọi Python trước, nếu không có, Code sẽ tự động Backup gọi `PowerShell`).

## Cách sử dụng

1. Tải toàn bộ Source code về giải nén.
2. Mở Command Prompt (CMD) hoặc Terminal tại thư mục chứa file `netflixcheck.js`.
3. Chạy câu lệnh Mở Menu Setup (Không Cần Cài thêm Package NPM):
```bash
node netflixcheck.js
```
4. Gõ số luồng Threads chạy.
5. Ở hộp thoại nổi lên, Hãy trỏ tới Folder chứa các file `.txt` Cookies.

## Bản quyền

Dự án này được chia sẻ dưới giấy phép **MIT**. Xem file `LICENSE` để biết thêm chi tiết.
