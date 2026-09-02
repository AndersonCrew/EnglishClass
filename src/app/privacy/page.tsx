import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Chính sách quyền riêng tư | EnglishClass", description: "Chính sách thu thập, sử dụng và bảo vệ dữ liệu trên EnglishClass." };

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Quyền riêng tư" title="Chính sách quyền riêng tư" summary="Chính sách này giải thích EnglishClass thu thập và sử dụng thông tin như thế nào khi giáo viên, học sinh và phụ huynh sử dụng nền tảng.">
      <LegalSection title="1. Phạm vi áp dụng"><p>Chính sách áp dụng cho website EnglishClass và các chức năng quản lý lớp, giao bài, làm bài, đánh giá và theo dõi tiến bộ học tập. Nền tảng được thiết kế cho giáo viên và học sinh tiểu học; tài khoản học sinh do giáo viên hoặc người quản lý có thẩm quyền tạo.</p></LegalSection>
      <LegalSection title="2. Thông tin được thu thập">
        <p>Tùy theo chức năng sử dụng, chúng tôi có thể xử lý:</p>
        <ul className="list-disc space-y-2 pl-6"><li>Thông tin tài khoản như họ tên, tên đăng nhập, vai trò và lớp học.</li><li>Thông tin học tập như nhiệm vụ, đáp án, bài nộp, điểm số, nhận xét và số lần làm bài.</li><li>Tệp học sinh chủ động gửi lên, bao gồm bản ghi âm cho bài Speaking và tệp liên quan đến bài học.</li><li>Thông tin kỹ thuật cần thiết để vận hành và bảo vệ website, như địa chỉ IP, loại trình duyệt, nhật ký lỗi và cookie phiên đăng nhập.</li></ul>
        <p>Không nên nhập thông tin không cần thiết như địa chỉ nhà, giấy tờ định danh hoặc dữ liệu sức khỏe vào bài làm.</p>
      </LegalSection>
      <LegalSection title="3. Mục đích sử dụng"><p>Thông tin được sử dụng để xác thực tài khoản, tổ chức lớp học, giao và nhận bài, chấm điểm, cung cấp phản hồi, hiển thị tiến bộ, đảm bảo an toàn hệ thống và khắc phục sự cố. Chúng tôi không bán thông tin cá nhân của học sinh.</p></LegalSection>
      <LegalSection title="4. Dịch vụ hỗ trợ vận hành">
        <p>EnglishClass sử dụng Supabase cho xác thực, cơ sở dữ liệu và lưu trữ tệp; Vercel để vận hành website. Các nhà cung cấp này có thể xử lý dữ liệu kỹ thuật cần thiết để cung cấp dịch vụ theo chính sách riêng của họ.</p>
        <p>Website có thể sử dụng Google AdSense để hiển thị quảng cáo. Google và các đối tác có thể dùng cookie, địa chỉ IP hoặc mã nhận dạng tương tự để phân phối, đo lường và bảo vệ quảng cáo. Các khu vực hướng đến trẻ em phải được xử lý theo chế độ hạn chế độ tuổi và không sử dụng quảng cáo dựa trên sở thích của trẻ.</p>
      </LegalSection>
      <LegalSection title="5. Cookie"><p>Cookie cần thiết được dùng để duy trì phiên đăng nhập và bảo vệ tài khoản. Khi quảng cáo hoặc dịch vụ đo lường được kích hoạt, cookie bổ sung có thể được sử dụng theo lựa chọn đồng ý áp dụng tại khu vực của người dùng. Chặn cookie cần thiết có thể khiến một số chức năng đăng nhập không hoạt động.</p></LegalSection>
      <LegalSection title="6. Dữ liệu của học sinh"><p>Giáo viên chỉ nên tạo tài khoản và sử dụng dữ liệu học sinh trong phạm vi phục vụ việc học. Phụ huynh hoặc người giám hộ có thể đề nghị xem, chỉnh sửa hoặc xóa thông tin của học sinh bằng cách liên hệ giáo viên phụ trách hoặc quản trị viên đã cung cấp tài khoản.</p></LegalSection>
      <LegalSection title="7. Lưu trữ và bảo mật"><p>Chúng tôi áp dụng phân quyền tài khoản và các biện pháp kỹ thuật phù hợp để hạn chế truy cập trái phép. Dữ liệu được lưu trong thời gian cần thiết để vận hành lớp học, giải quyết yêu cầu hoặc đáp ứng nghĩa vụ phù hợp. Không hệ thống trực tuyến nào có thể đảm bảo an toàn tuyệt đối.</p></LegalSection>
      <LegalSection title="8. Quyền và yêu cầu của người dùng"><p>Người dùng có thể yêu cầu kiểm tra, sửa hoặc xóa dữ liệu không còn cần thiết. Với tài khoản học sinh, yêu cầu nên được thực hiện qua giáo viên phụ trách hoặc quản trị viên của lớp để xác minh đúng người và bảo vệ học sinh.</p></LegalSection>
      <LegalSection title="9. Thay đổi chính sách"><p>Chính sách có thể được cập nhật khi tính năng, nhà cung cấp hoặc yêu cầu bảo vệ dữ liệu thay đổi. Ngày cập nhật mới nhất luôn được hiển thị ở đầu trang.</p></LegalSection>
      <LegalSection title="10. Liên hệ"><p>Nếu có câu hỏi về quyền riêng tư hoặc dữ liệu học sinh, vui lòng liên hệ giáo viên phụ trách hoặc quản trị viên EnglishClass thông qua kênh liên hệ đã được cung cấp cùng tài khoản.</p></LegalSection>
    </LegalPage>
  );
}
