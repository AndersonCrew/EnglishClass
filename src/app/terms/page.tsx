import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Điều khoản sử dụng | EnglishClass", description: "Các điều khoản áp dụng khi sử dụng nền tảng EnglishClass." };

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Điều khoản" title="Điều khoản sử dụng" summary="Khi sử dụng EnglishClass, người dùng đồng ý sử dụng nền tảng đúng mục đích giáo dục, tôn trọng người khác và bảo vệ thông tin tài khoản.">
      <LegalSection title="1. Mục đích của nền tảng"><p>EnglishClass hỗ trợ giáo viên quản lý lớp, giao nhiệm vụ Listening, Speaking, Reading và Writing; hỗ trợ học sinh làm bài, nộp bài và nhận đánh giá. Nền tảng không thay thế hoàn toàn hướng dẫn chuyên môn của giáo viên.</p></LegalSection>
      <LegalSection title="2. Tài khoản và quyền truy cập"><p>Người dùng phải sử dụng đúng tài khoản được cấp và không chia sẻ mật khẩu cho người không có thẩm quyền. Giáo viên chịu trách nhiệm quản lý tài khoản học sinh do mình tạo. Học sinh cần thông báo cho giáo viên khi nghi ngờ tài khoản bị sử dụng trái phép.</p></LegalSection>
      <LegalSection title="3. Trách nhiệm của giáo viên"><ul className="list-disc space-y-2 pl-6"><li>Chỉ tạo và quản lý tài khoản học sinh thuộc phạm vi lớp phụ trách.</li><li>Đảm bảo thông tin nhập vào là cần thiết và phù hợp với mục đích giáo dục.</li><li>Đánh giá bài làm công bằng, sử dụng nhận xét phù hợp lứa tuổi.</li><li>Xử lý yêu cầu của phụ huynh hoặc học sinh liên quan đến tài khoản và dữ liệu lớp.</li></ul></LegalSection>
      <LegalSection title="4. Trách nhiệm của học sinh"><ul className="list-disc space-y-2 pl-6"><li>Tự thực hiện bài học theo hướng dẫn và không sử dụng tài khoản của bạn khác.</li><li>Không tải lên nội dung xúc phạm, nguy hiểm, vi phạm quyền riêng tư hoặc không liên quan đến bài học.</li><li>Không tìm cách truy cập lớp, bài làm hoặc dữ liệu của người khác.</li></ul></LegalSection>
      <LegalSection title="5. Nội dung và bài làm"><p>Người dùng giữ quyền đối với nội dung mình tạo. Khi nộp bài, người dùng cho phép EnglishClass lưu trữ và hiển thị nội dung đó cho giáo viên, học sinh liên quan và quản trị viên trong phạm vi cần thiết để cung cấp dịch vụ học tập.</p></LegalSection>
      <LegalSection title="6. Quảng cáo và liên kết bên ngoài"><p>Website có thể hiển thị quảng cáo hoặc liên kết của bên thứ ba. Quảng cáo không phải là sự xác nhận hay bảo đảm của EnglishClass đối với sản phẩm được quảng bá. Người dùng nhỏ tuổi nên trao đổi với phụ huynh hoặc giáo viên trước khi truy cập, đăng ký hoặc mua sản phẩm từ bên thứ ba.</p></LegalSection>
      <LegalSection title="7. Hành vi không được phép"><p>Không được phá hoại hệ thống, thử vượt qua phân quyền, thu thập dữ liệu người dùng khác, tự động tạo lưu lượng hoặc lượt nhấp quảng cáo, sử dụng nội dung trái pháp luật, hoặc dùng nền tảng gây tổn hại cho người khác.</p></LegalSection>
      <LegalSection title="8. Tạm ngừng tài khoản"><p>Tài khoản hoặc quyền truy cập có thể bị tạm ngừng khi có dấu hiệu xâm phạm an toàn, sử dụng sai mục đích hoặc vi phạm điều khoản. Khi phù hợp, người dùng có thể liên hệ giáo viên hoặc quản trị viên để được xem xét.</p></LegalSection>
      <LegalSection title="9. Tính sẵn sàng và giới hạn"><p>Chúng tôi cố gắng duy trì dịch vụ ổn định nhưng không cam kết website luôn hoạt động không gián đoạn. Việc bảo trì, lỗi mạng hoặc giới hạn của nhà cung cấp có thể ảnh hưởng tạm thời đến dịch vụ. Giáo viên nên lưu bản sao những tài liệu quan trọng.</p></LegalSection>
      <LegalSection title="10. Thay đổi điều khoản và liên hệ"><p>Điều khoản có thể được cập nhật khi nền tảng thay đổi. Việc tiếp tục sử dụng sau khi điều khoản mới được công bố được xem là chấp nhận phiên bản cập nhật. Nếu có câu hỏi, hãy liên hệ giáo viên phụ trách hoặc quản trị viên EnglishClass qua kênh đã được cung cấp.</p></LegalSection>
    </LegalPage>
  );
}
