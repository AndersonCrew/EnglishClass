# EnglishClass — Product Requirements

## Vai trò

- `ADMIN`: quản trị vận hành, duyệt/khóa teacher, quản lý tài khoản, giám sát lớp và xem audit log. Không chấm bài hoặc sửa assignment thay teacher.
- `TEACHER`: quản lý lớp, học sinh, bài tập và đánh giá trong phạm vi lớp sở hữu.
- `STUDENT`: làm bài và xem kết quả của chính mình.

## Teacher approval

Teacher đăng ký mới có trạng thái `PENDING`. Chỉ `APPROVED` được vào `/teacher`. `REJECTED` và `SUSPENDED` bị chặn nhưng dữ liệu không bị xóa.

## Admin MVP

- Dashboard tổng quan và danh sách cần xử lý.
- Danh sách/chi tiết teacher; approve, reject, suspend, reactivate.
- Danh sách/chi tiết student; suspend/reactivate, reset password, remove membership, hard delete có xác nhận mạnh.
- Danh sách lớp ở mức giám sát.
- Audit log cho thao tác đặc quyền.

Hard delete student bị từ chối nếu còn submission để không âm thầm xóa lịch sử học tập. Chuyển lớp giữa giáo viên là tính năng tương lai.
