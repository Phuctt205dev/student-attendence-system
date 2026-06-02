import { extractQuestionsRegex } from './server/services/questionParser.js';

const text = `Câu 1: Phương thức HTTP nào thường được sử dụng để lấy dữ liệu từ server?
A. POST
B. GET
C. DELETE
D. PUT
Câu 2: Mã trạng thái HTTP nào biểu thị yêu cầu thành công?
A. 404
B. 403
C. 500
D. 200
Câu 3: Cơ sở dữ liệu nào sau đây là hệ quản trị cơ sở dữ liệu quan hệ (SQL)?
A. MongoDB
B. Redis
C. MySQL
D. Firebase
Câu 4: JWT thường được sử dụng cho mục đích gì?
A. Xác thực người dùng
B. Lưu trữ hình ảnh
C. Tăng tốc mạng
D. Thiết kế giao diện
Câu 5: API là cầu nối giúp các thành phần phần mềm thực hiện chức năng nào?
A. Chạy hệ điều hành
B. Giao tiếp và trao đổi dữ liệu với nhau
C. Lưu trữ tập tin
D. Tăng dung lượng bộ nhớ`;

console.log('Result:', JSON.stringify(extractQuestionsRegex(text), null, 2));
