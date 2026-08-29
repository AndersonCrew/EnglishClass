# EnglishClass — Architecture Decision Document

## 1. Mục tiêu và phạm vi MVP

EnglishClass hỗ trợ một quy trình duy nhất, xuyên suốt:

> Giáo viên giao nhiệm vụ → học sinh thực hiện và nộp bài → giáo viên đánh giá → giáo viên/học sinh theo dõi tiến bộ.

Hai vai trò trong MVP:

- `TEACHER`: tạo và quản lý lớp; thêm/import học sinh; giao bài; theo dõi trạng thái; chấm và nhận xét.
- `STUDENT`: đăng nhập; xem bài được giao; làm/nộp bài; xem kết quả và nhận xét của chính mình.

MVP chưa xây dựng sổ khen thưởng, báo cáo học kỳ phức tạp, giao tiếp phụ huynh, gamification, thanh toán, thông báo đa kênh hay hệ thống nội dung học tập. Các phần này chỉ được xem xét sau khi quy trình cốt lõi được kiểm chứng.

### Giả định nghiệp vụ

- Mỗi lớp có đúng một giáo viên sở hữu trong MVP.
- Một học sinh có thể tham gia nhiều lớp.
- Một assignment thuộc một lớp và gồm một hoặc nhiều task.
- Mỗi task thuộc đúng một kỹ năng: `LISTENING`, `SPEAKING`, `READING`, `WRITING`.
- Mỗi học sinh có tối đa một submission cho mỗi task; submission có thể được cập nhật cho đến hạn nộp hoặc khi giáo viên khóa bài.
- Mỗi submission có tối đa một assessment hiện hành trong MVP.
- Giáo viên chỉ chấm theo thang điểm và nhận xét đơn giản; rubric chi tiết để sau.

## 2. Quyết định kiến trúc

### 2.1 Kiểu kiến trúc

Sử dụng **modular monolith** trên Next.js App Router. UI, Server Components, Server Actions/Route Handlers và domain modules nằm trong cùng một ứng dụng triển khai lên Vercel. Supabase cung cấp PostgreSQL, Auth và Storage.

Lựa chọn này phù hợp free tier, giảm chi phí vận hành và vẫn giữ ranh giới feature rõ để có thể mở rộng sau này. Không sử dụng backend server riêng, microservices, queue hoặc cache ngoài.

### 2.2 Ranh giới các tầng

- **UI**: page, layout và component trình bày; không chứa truy vấn SQL hay luật nghiệp vụ.
- **Application/business logic**: use case theo feature, ví dụ `createClassroom`, `publishAssignment`, `submitTask`, `assessSubmission`.
- **Data access**: repository/query functions gọi Supabase; nhận Supabase client phù hợp và trả về type của domain.
- **Validation**: schema Zod tại biên hệ thống cho form, Server Action, Route Handler và file import.
- **Types**: database types được sinh từ Supabase; domain/input types đặt gần feature sở hữu.

Luồng ghi dữ liệu chuẩn:

`Form/UI → Server Action hoặc Route Handler → Zod validation → use case → repository/Supabase → typed result`

Server Components ưu tiên cho đọc dữ liệu. Client Components chỉ dùng khi cần tương tác phía trình duyệt. Các mutation quan trọng chạy phía server và database vẫn là lớp bảo vệ cuối cùng bằng RLS/constraint.

### 2.3 Supabase clients

- Browser client dùng publishable/anon key, chịu RLS.
- Server client dùng session/cookie của người dùng, vẫn chịu RLS.
- Admin client dùng service-role key chỉ trong server-only module cho các thao tác đặc quyền như tạo hàng loạt Auth users. Tuyệt đối không import module này vào Client Component.

Service-role không thay thế kiểm tra quyền. Trước khi dùng admin client, server phải xác thực teacher hiện tại và quyền sở hữu classroom đích.

## 3. Mô hình dữ liệu

Tất cả khóa chính dùng `uuid`; thời gian dùng `timestamptz`; tên bảng/cột dùng `snake_case`. Các bảng chính có `created_at`, và thêm `updated_at` khi bản ghi được chỉnh sửa.

### 3.1 Enum

```sql
create type user_role as enum ('TEACHER', 'STUDENT');
create type skill_type as enum ('LISTENING', 'SPEAKING', 'READING', 'WRITING');
create type assignment_status as enum ('DRAFT', 'PUBLISHED', 'CLOSED');
create type submission_status as enum ('DRAFT', 'SUBMITTED', 'RETURNED');
```

Enum trạng thái nên giữ nhỏ. Trạng thái hoàn thành assignment được suy ra từ các task/submission thay vì lưu trùng lặp.

### 3.2 Bảng

#### `profiles`

- `id uuid primary key references auth.users(id) on delete cascade`
- `role user_role not null`
- `full_name text not null`
- `date_of_birth date null`, `gender student_gender null`, `parent_phone text null` — chỉ dùng cho student
- `username text null unique` — username đăng nhập ổn định, không tự đổi khi sửa tên
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Không lưu mật khẩu trong `profiles`. Mật khẩu chỉ do Supabase Auth quản lý.

Đăng ký công khai trong MVP chỉ dành cho teacher. Trigger `on_auth_user_created` tự tạo `profiles`: role mặc định là `TEACHER`; luồng admin tạo student phải đặt `raw_app_meta_data.role = STUDENT`. Frontend không gửi và không quyết định role. `raw_user_meta_data.full_name` chỉ dùng làm tên hiển thị, không dùng để authorization.

Student dùng username trên UI; server ánh xạ username sang synthetic internal email theo domain cố định để làm việc với Supabase Auth. Email nội bộ không hiển thị cho student. Tạo/reset tài khoản dùng admin client server-only sau khi session teacher và quyền sở hữu classroom được kiểm tra lại. Plaintext temporary password chỉ tồn tại trong kết quả một lần, không ghi database/log.

#### `classrooms`

- `id uuid primary key default gen_random_uuid()`
- `teacher_id uuid not null references profiles(id)`
- `name text not null`
- `grade_level smallint not null check (grade_level between 1 and 5)`
- `academic_year text not null`
- `created_at`, `updated_at`

Index: `(teacher_id)`. Constraint/trigger đảm bảo `teacher_id` là profile có role `TEACHER`.

#### `class_members`

- `classroom_id uuid references classrooms(id) on delete cascade`
- `student_id uuid references profiles(id) on delete cascade`
- `created_at timestamptz not null default now()`
- `primary key (classroom_id, student_id)`

Constraint/trigger đảm bảo thành viên có role `STUDENT`. Khóa kép ngăn thêm trùng.

#### `assignments`

- `id uuid primary key default gen_random_uuid()`
- `classroom_id uuid not null references classrooms(id) on delete cascade`
- `title text not null`
- `description text null`
- `status assignment_status not null default 'DRAFT'`
- `due_at timestamptz null`
- `created_at`, `updated_at`

Index: `(classroom_id, status, due_at)`.

#### `tasks`

- `id uuid primary key default gen_random_uuid()`
- `assignment_id uuid not null references assignments(id) on delete cascade`
- `skill skill_type not null`
- `title text not null`
- `instruction text null`
- `content jsonb not null default '{}'::jsonb`
- `order_index integer not null check (order_index >= 0)`
- `created_at`, `updated_at`
- `unique (assignment_id, order_index)`

`content` chỉ chứa cấu hình cần cho từng kỹ năng, được validate bằng discriminated union Zod theo `skill`. MVP tránh tạo nhiều bảng con khi cấu trúc task còn đang thay đổi. File media được lưu trong Storage; database chỉ lưu bucket/path và metadata cần thiết, không lưu public URL cố định.

#### `submissions`

- `id uuid primary key default gen_random_uuid()`
- `task_id uuid not null references tasks(id) on delete cascade`
- `student_id uuid not null references profiles(id)`
- `answer_text text null`
- `answer_file_path text null` — Storage object path, không phải public URL
- `answer_metadata jsonb not null default '{}'::jsonb`
- `status submission_status not null default 'DRAFT'`
- `submitted_at timestamptz null`
- `created_at`, `updated_at`
- `unique (task_id, student_id)`

Ba trường answer hỗ trợ text, file/audio và metadata có cấu trúc mà không cần tách bảng theo kỹ năng. Database trigger kiểm tra student là thành viên của classroom chứa task, ép actor đăng nhập thành `student_id`, tự quản lý `submitted_at`, và không cho đổi `task_id`/`student_id` sau khi tạo.

Index: `(student_id, status)`, `(task_id, status)`.

#### `assessments`

- `id uuid primary key default gen_random_uuid()`
- `submission_id uuid not null unique references submissions(id) on delete cascade`
- `assessed_by uuid not null references profiles(id)`
- `score numeric(5,2) not null check (score between 0 and 100)`
- `feedback text null`
- `assessed_at timestamptz not null default now()`
- `created_at`, `updated_at`

MVP dùng thang điểm chuẩn hóa 0–100 vì task chưa có cấu hình điểm tối đa. Trigger ép `assessed_by` về actor đăng nhập, cập nhật `assessed_at`, và đảm bảo teacher sở hữu classroom tương ứng.

### 3.3 Quan hệ chính

```text
auth.users 1──1 profiles
profiles(teacher) 1──N classrooms
classrooms N──N profiles(student) qua class_members
classrooms 1──N assignments 1──N tasks
tasks 1──N submissions N──1 profiles(student)
submissions 1──0..1 assessments N──1 profiles(teacher, assessed_by)
```

### 3.4 Tài khoản học sinh và import hàng loạt

MVP hỗ trợ CSV theo template cố định, ví dụ `full_name, grade_level` và một mã định danh tùy chọn của trường. `grade_level` phục vụ bước import/đối chiếu lớp nhưng không lưu trong `profiles` của schema MVP. Quy trình:

1. Teacher tải file; server kiểm tra MIME, kích thước, số dòng và validate toàn bộ dữ liệu.
2. Server xác thực teacher sở hữu classroom.
3. Server sinh username/email kỹ thuật duy nhất và mật khẩu tạm đủ mạnh.
4. Admin client tạo Supabase Auth user, sau đó tạo `profiles` và `class_members`.
5. Trả về danh sách thông tin đăng nhập đúng một lần để teacher tải/in.

Không lưu mật khẩu dạng rõ trong PostgreSQL, log hay analytics. Vì Supabase Admin API và PostgreSQL không cùng một transaction, import phải trả kết quả theo từng dòng và có cơ chế dọn bản ghi Auth vừa tạo nếu bước database thất bại. Giới hạn batch nhỏ (ví dụ 50 học sinh/lần) để phù hợp serverless/free tier; chưa cần queue.

## 4. Row Level Security

Bật RLS trên tất cả bảng trong `public`. Các policy dùng `auth.uid()` và quan hệ sở hữu/thành viên; không tin `teacher_id` hoặc `student_id` gửi từ client.

### Quyền đọc/ghi dự kiến

| Bảng | Teacher | Student |
|---|---|---|
| `profiles` | đọc/sửa profile mình; đọc student trong lớp mình | đọc/sửa giới hạn profile mình; đọc teacher của lớp mình khi UI cần |
| `classrooms` | CRUD lớp có `teacher_id = auth.uid()` | chỉ đọc lớp mình có membership |
| `class_members` | đọc/xóa thành viên của lớp mình; thêm qua trusted server import/enrolment flow | chỉ đọc membership của chính mình |
| `assignments` | CRUD assignment thuộc lớp mình | đọc assignment `PUBLISHED/CLOSED` của lớp mình |
| `tasks` | CRUD task của assignment thuộc lớp mình | đọc task thuộc assignment đã publish trong lớp mình |
| `submissions` | đọc submission thuộc lớp mình; không giả danh student để tạo | CRUD submission của chính mình cho task hợp lệ; không sửa sau khi bị khóa theo rule MVP |
| `assessments` | CRUD assessment cho submission thuộc lớp mình | chỉ đọc assessment của submission chính mình |

Các policy lặp lại logic sở hữu nên được hỗ trợ bởi SQL helper functions `security definer` rất nhỏ như `is_classroom_teacher(classroom_id)` và `is_classroom_member(classroom_id)`. Hàm phải đặt `search_path` cố định, không nhận user id tùy ý khi có thể dùng `auth.uid()`, và không cấp quyền thực thi rộng hơn cần thiết.

RLS cần được kiểm thử bằng cả hai vai trò, bao gồm các ca truy cập chéo lớp, đoán UUID, sửa foreign key và truy cập Storage object.

## 5. Supabase Storage

Bucket đề xuất:

- `assignment-assets`: audio/hình/tài liệu do teacher tải lên.
- `submission-assets`: audio speaking, ảnh hoặc file bài làm của student.

Hai bucket để **private**. Object path có cấu trúc giúp policy kiểm tra quyền, ví dụ:

- `assignment-assets/{classroom_id}/{assignment_id}/{uuid}.{ext}`
- `submission-assets/{classroom_id}/{task_id}/{student_id}/{uuid}.{ext}`

Client truy cập bằng signed URL thời hạn ngắn sau khi server/RLS xác nhận quyền. Validate loại file, phần mở rộng, kích thước và thời lượng hợp lý; tên file do server sinh, không dùng trực tiếp tên người dùng gửi lên. Storage policies phải phản chiếu quyền database.

## 6. Cấu trúc source đề xuất

```text
.
├── docs/
│   └── ARCHITECTURE.md
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (teacher)/
│   │   ├── (student)/
│   │   ├── api/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── features/
│   │   ├── auth/
│   │   ├── classroom/
│   │   ├── student/
│   │   ├── assignment/
│   │   ├── submission/
│   │   └── assessment/
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── browser.ts
│   │   │   ├── server.ts
│   │   │   └── admin.server.ts
│   │   ├── auth/
│   │   └── utils/
│   └── types/
│       └── database.generated.ts
├── middleware.ts
└── package.json
```

Mỗi feature chỉ tạo các thư mục thực sự cần, thường gồm:

```text
features/classroom/
├── components/
├── schemas/
├── server/
│   ├── actions.ts
│   ├── service.ts
│   └── repository.ts
└── types.ts
```

Không tạo một framework nội bộ cứng nhắc. `server/` phải được đánh dấu/import theo cách ngăn kéo code bí mật sang client. Shared UI không biết Supabase; component chỉ dùng trong một domain ở lại trong feature đó.

## 7. Routing ban đầu

```text
/login
/register
/teacher/classes
/teacher/classes/[classroomId]
/teacher/classes/[classroomId]/students
/teacher/classes/[classroomId]/assignments
/teacher/assignments/[assignmentId]
/teacher/submissions/[submissionId]
/student/tasks
/student/tasks/[taskId]
/student/results
```

Route groups tách layout teacher/student nhưng không thay đổi URL. Middleware chỉ làm redirect/session refresh ở mức thô; authorization thật phải diễn ra trong server use case và RLS.

## 8. UI/UX định hướng

- Teacher: desktop-first, bảng dữ liệu rõ, trạng thái đã/chưa nộp dễ quét, thao tác hàng loạt có xác nhận và kết quả chi tiết.
- Student: mobile/tablet-first, một hành động chính mỗi màn hình, nút lớn, câu chữ ngắn, icon đi kèm nhãn (không dùng icon đơn độc), trạng thái nộp bài rõ ràng.
- Dùng màu tiết chế và không dựa duy nhất vào màu để truyền đạt trạng thái.
- Hỗ trợ keyboard, focus state, contrast và vùng bấm phù hợp. Tiếng Việt là ngôn ngữ UI đầu tiên; thuật ngữ kỹ năng có thể hiển thị song ngữ.

## 9. Các phase phát triển

### Phase 0 — Foundation

- Khởi tạo Next.js latest stable bằng pnpm, App Router, TypeScript strict, Tailwind.
- Cấu hình Supabase local/project, biến môi trường và sinh database types.
- Migration schema, trigger, RLS và seed tối thiểu.
- Thiết lập lint, format và test cơ bản.

### Phase 1 — Auth, lớp và học sinh

- Đăng nhập/đăng xuất và route theo role.
- Teacher tạo/sửa lớp.
- Thêm một học sinh và import CSV theo batch.
- Student đăng nhập bằng credential được cấp.

**Mốc kiểm chứng:** teacher tạo lớp và cấp tài khoản; student đăng nhập và thấy đúng lớp.

### Phase 2 — Assignment và task

- Teacher tạo draft, thêm task theo bốn skill và publish.
- Upload assignment asset riêng tư.
- Student xem danh sách và chi tiết nhiệm vụ được giao.

### Phase 3 — Submission

- Student lưu/nộp câu trả lời text hoặc file/audio.
- Teacher xem danh sách đã/chưa nộp theo assignment/task.
- Xử lý trạng thái nộp và hạn nộp ở mức MVP.

### Phase 4 — Assessment và tiến bộ cơ bản

- Teacher nhập điểm, nhận xét và trả bài.
- Student xem kết quả của mình.
- Teacher xem tiến bộ cơ bản theo học sinh và bốn kỹ năng bằng truy vấn tổng hợp; chưa cần hệ thống báo cáo phức tạp.

### Phase 5 — Hardening và deploy

- Test quyền/RLS và luồng nghiệp vụ quan trọng.
- Kiểm tra accessibility, responsive, giới hạn upload và lỗi mạng.
- Deploy Vercel, cấu hình Supabase production, backup/export tối thiểu và quan sát lỗi không chứa dữ liệu nhạy cảm.

Chỉ bắt đầu phase tiếp theo khi mốc kiểm chứng của phase hiện tại hoạt động end-to-end.

## 10. Security và privacy cần lưu ý

1. **Authorization nhiều lớp:** kiểm tra session/role trong server use case và bật RLS; middleware không phải ranh giới bảo mật.
2. **Service-role key:** chỉ tồn tại ở server environment, module có hậu tố `.server.ts`; không dùng biến `NEXT_PUBLIC_*`, không log hoặc trả về client.
3. **Mass assignment:** server tự lấy actor từ `auth.uid()`; không chấp nhận `teacher_id`, `student_id`, role, score owner từ payload nếu có thể suy ra.
4. **Validation:** Zod cho mọi input; PostgreSQL constraint/foreign key cho invariant. JSONB phải có schema theo skill và giới hạn độ dài/kích thước.
5. **Auth cho trẻ em:** không thu thập email/điện thoại cá nhân nếu không cần. Tài khoản kỹ thuật phải duy nhất; mật khẩu tạm chỉ hiển thị một lần và nên hỗ trợ teacher reset.
6. **Credential import:** không lưu plaintext password, không đưa credential vào log, error tracker, URL hoặc analytics; file kết quả cần được teacher quản lý cẩn thận.
7. **Storage:** bucket private, signed URL ngắn hạn, policy theo lớp/user, kiểm tra MIME/kích thước và tên object do server sinh.
8. **IDOR/cross-class access:** test mọi đường dẫn có UUID bằng user thuộc lớp khác; không dựa vào việc UUID khó đoán.
9. **XSS và file content:** render nội dung người dùng như text mặc định; nếu sau này hỗ trợ rich text phải sanitize. Không phục vụ file upload dưới dạng thực thi.
10. **Rate/abuse limits:** giới hạn đăng nhập, import và upload ở mức phù hợp; xử lý lỗi Supabase/Vercel rõ ràng. Free tier có quota nên tránh polling và truy vấn N+1.
11. **Data minimization:** chỉ thu thập dữ liệu cần cho học tập; xác định quy trình xóa học sinh/lớp và retention trước khi dùng thật tại trường.
12. **Audit tối thiểu:** `created_at`, `updated_at`, actor trên assessment; chưa cần hệ thống event/audit phức tạp trong MVP.
13. **Secrets và môi trường:** tách development/production, không commit `.env*`, xoay key nếu lộ và giới hạn preview deployment truy cập dữ liệu thật.
14. **Concurrency/integrity:** unique constraints ngăn submission/membership trùng; mutation nhiều bước dùng transaction/RPC khi nằm hoàn toàn trong PostgreSQL.
15. **Enrollment escalation:** không cấp `INSERT` trực tiếp trên `class_members` cho authenticated client. Nếu không, teacher biết UUID có thể tự gắn một student bất kỳ vào lớp rồi mở rộng quyền đọc. Thêm/import thành viên phải qua trusted server flow, xác thực teacher sở hữu lớp và nguồn student hợp lệ.

## 11. Testing tối thiểu

- Unit test cho validation và business rules quan trọng.
- Integration test repository/use case với Supabase test project/local database.
- RLS matrix test cho teacher đúng lớp, teacher khác lớp, student đúng lớp, student khác lớp và anonymous.
- E2E smoke test cho hai luồng: teacher tạo/giao bài; student nộp và nhận kết quả.

Ưu tiên test boundary quyền và quy trình cốt lõi hơn snapshot UI.

## 12. Quyết định hoãn lại

Chưa quyết định hoặc triển khai trong MVP:

- Rubric nhiều tiêu chí, nhiều lượt chấm hoặc lịch sử phiên bản assessment.
- Báo cáo tuần/tháng/học kỳ chuyên sâu và xuất PDF/Excel.
- Sổ rèn luyện/khen thưởng, huy hiệu, điểm thưởng.
- Phụ huynh, nhiều teacher đồng quản lý một lớp, trường/tenant.
- Push notification, email workflow, realtime presence.
- AI chấm nói/viết, thư viện bài tập, marketplace nội dung.
- Offline mode, native mobile app và tích hợp LMS khác.

Các tính năng này chỉ được thiết kế khi có dữ liệu sử dụng thực tế. Schema hiện tại đủ để phát triển quy trình cốt lõi mà không cam kết trước vào các mô hình chưa được kiểm chứng.

## 13. Tiêu chí thành công của kiến trúc MVP

- Một teacher không thể đọc hoặc sửa dữ liệu của lớp teacher khác.
- Một student chỉ thấy assignment đã phát hành trong lớp mình và chỉ thao tác submission của chính mình.
- Import học sinh cho kết quả theo từng dòng, không rò rỉ service-role key hay plaintext password vào hệ thống lưu trữ/log.
- Quy trình giao bài đến nhận kết quả hoạt động end-to-end trên Vercel + Supabase free tier.
- Business logic quan trọng không nằm trực tiếp trong React components và database access có type rõ ràng.
