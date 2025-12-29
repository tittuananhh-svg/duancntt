import nodemailer from "nodemailer";

export const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

export async function sendStudentWelcomeEmail(opts: {
  to: string;
  username: string;
  password: string;
}) {
  const web = process.env.WEB || "";
  const loginUrl = web.startsWith("http") ? web : `https://${web}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Thông báo nhập học thành công</h2>
      <p>Chúc mừng bạn đã nhập học thành công.</p>
      <p><b>Thông tin tài khoản:</b></p>
      <ul>
        <li>Username: <b>${opts.username}</b></li>
        <li>Mật khẩu: <b>${opts.password}</b></li>
      </ul>
      <p>Link đăng nhập: <a href="${loginUrl}">${loginUrl}</a></p>
      <p><i>Vui lòng đăng nhập và đổi mật khẩu ngay sau lần đăng nhập đầu tiên.</i></p>
    </div>
  `;

  await mailer.sendMail({
    from: `"Web Quản Lý Đại Học" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject: "Nhập học thành công - Thông tin tài khoản",
    html,
  });
}
