import { redirect } from 'next/navigation';

export default function Home() {
  // Chuyển hướng người dùng sang trang Đăng nhập mặc định
  redirect('/login');
}
