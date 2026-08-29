# Tạo tài khoản ADMIN đầu tiên

ADMIN không có luồng đăng ký công khai và không được hard-code trong source.

1. Vào Supabase Dashboard → Authentication → Users → Add user. Tạo user bằng email và mật khẩu mạnh, bật xác nhận email.
2. Chạy migration `202608290011_admin_management.sql` trước.
3. Trong SQL Editor, thay UUID dưới đây bằng UUID Auth user vừa tạo rồi chạy:

Trigger bảo vệ role chặn mọi cập nhật thông thường. Bootstrap dùng transaction đặc biệt dưới đây; trigger chỉ bị tắt trong transaction và tự rollback nếu có lỗi:

```sql
begin;

alter table public.profiles disable trigger profiles_protect_fields;

update public.profiles
set role = 'ADMIN', teacher_approval_status = null, account_status = 'ACTIVE'
where id = 'THAY_UUID_AUTH_USER_TAI_DAY'::uuid
  and role = 'TEACHER';

alter table public.profiles enable trigger profiles_protect_fields;

commit;
```

Sau đó kiểm tra câu lệnh đã cập nhật đúng một tài khoản:

```sql
select id, role, full_name, account_status
from public.profiles
where id = 'THAY_UUID_AUTH_USER_TAI_DAY'::uuid;
```

4. Đăng xuất rồi đăng nhập lại. ADMIN được chuyển tới `/admin`.

Không dùng service-role key trong trình duyệt và không lưu email/mật khẩu ADMIN trong repository.
