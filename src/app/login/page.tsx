export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-amber-400 to-red-500 p-8 gap-6">
      <div className="text-6xl">🏠</div>
      <h1 className="text-white text-2xl font-extrabold text-center">Quản lý<br/>phòng trọ</h1>
      <p className="text-white/80 text-sm text-center">Chia sẻ chi phí dễ dàng với bạn cùng phòng</p>
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm space-y-3">
        <a href="/api/auth/zalo/login"
          className="flex items-center justify-center gap-2 bg-[#0068ff] text-white rounded-xl py-3 font-bold text-sm w-full">
          <span className="text-lg">💬</span> Đăng nhập bằng Zalo
        </a>
        <p className="text-center text-xs text-gray-400">Không cần tạo tài khoản mới</p>
      </div>
    </div>
  )
}
