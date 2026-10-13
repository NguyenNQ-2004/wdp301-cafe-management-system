import React, { useState } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Form states
  const [loginIdentifier, setLoginIdentifier] = useState('barista@auracafe.vn');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [forgotInput, setForgotInput] = useState('');

  if (!isOpen) return null;

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginIdentifier, password: loginPassword }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        triggerToast(data.message || 'Đăng nhập thất bại. Kiểm tra lại SĐT/Mật khẩu.');
        return;
      }

      triggerToast('Đăng nhập thành công vào Hệ thống!');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess({ name: data.fullName, role: data.role, ...data });
        }
        onClose();
      }, 700);
    } catch (error) {
      triggerToast('Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regName,
          phone: regPhone,
          email: regEmail,
          password: regPassword,
          role: 'CUSTOMER'
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        triggerToast(data.message || 'Đăng ký thất bại. SĐT có thể đã tồn tại.');
        return;
      }

      triggerToast('Tạo tài khoản thành công! Đã chuyển tiếp vào hệ thống.');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess({ name: data.fullName, role: data.role, ...data });
        }
        onClose();
      }, 800);
    } catch (error) {
      triggerToast('Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.');
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast('Đã gửi liên kết khôi phục mật khẩu qua Gmail của bạn!');
    setTimeout(() => {
      setActiveTab('login');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-gutter md:p-gutter-lg bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Container card */}
      <div className="w-full max-w-4xl bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
          title="Đóng"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Left Atmospheric Brand Showcase (Visual Richness) */}
        <div className="relative w-full md:w-5/12 bg-surface-container p-space-xl flex flex-col justify-between overflow-hidden min-h-[260px] md:min-h-[580px]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-multiply"
            style={{
              backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAGFUqokLpPQhYrL16Lx1MmWKuiDJT-ODG6DB0BHusP12uZytq7EXIlX8NPaQjkCjGB962XBMQtan6ezZNms1rtoX6miKboAymKvO9ofSFSV355L6uD3GniaPpqO7EkrnrQHFympfYpI2XS2W_2wxEJHvbcy2DOo0Ycop5LZ7iuoWV3pcYpESD0Eo_0xCKo_FdIzK8HVEvMlyK6s2Vnxxnjxl9kVFsG3tT8-M5dD_clWwQiVacYM5ot')`
            }}
          />
          {/* Subtle Crimson Accent Glow */}
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-primary-container/15 blur-2xl pointer-events-none" />

          {/* Brand Header */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-space-sm bg-surface-container-lowest/80 backdrop-blur px-space-md py-space-xs rounded-full shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse" />
              <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest font-semibold">
                Hệ Thống Vận Hành 2.4
              </span>
            </div>
          </div>

          {/* Mid Narrative & Micro Metric Badge */}
          <div className="relative z-10 my-auto py-space-lg">
            <div className="flex items-center gap-space-sm mb-space-sm">
              <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-md">
                <span className="material-symbols-outlined text-[20px]">local_cafe</span>
              </div>
              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                  Aura <span className="text-primary-container">Café</span>
                </h1>
                <p className="font-label-sm text-label-sm text-secondary">Crafting Digital Moments</p>
              </div>
            </div>
            <p className="font-body-md text-body-md text-secondary mt-space-md leading-relaxed hidden md:block">
              Nền tảng quản trị đồng bộ đa vai trò: Thu ngân, Pha chế KDS, Shipper và Quản lý chuỗi chi nhánh thời gian thực.
            </p>
            {/* Metric Inline Chip */}
            <div className="mt-space-lg hidden md:flex items-center gap-space-md bg-surface-container-lowest/70 backdrop-blur p-space-sm rounded-lg shadow-sm">
              <div className="p-space-xs bg-surface-container-high rounded text-primary">
                <span className="material-symbols-outlined text-[20px]">bolt</span>
              </div>
              <div className="min-w-0">
                <div className="font-label-sm text-label-sm text-secondary">Tốc độ xử lý đơn POS</div>
                <div className="font-tabular-data text-tabular-data font-bold text-on-surface">
                  &lt; 1.8 giây / đơn
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Brand Metadata */}
          <div className="relative z-10 flex items-center justify-between text-secondary pt-space-md">
            <span className="font-label-sm text-label-sm tracking-wider uppercase">
              Chi nhánh Sài Gòn • Hà Nội
            </span>
            <span className="font-tabular-data text-label-sm">v2.4.9-PRO</span>
          </div>
        </div>

        {/* Right Interactive Form Container */}
        <div className="w-full md:w-7/12 p-space-lg md:p-space-xl flex flex-col justify-center bg-surface-container-lowest">
          {/* Interactive Tab Selector */}
          <div className="flex items-center p-1 bg-surface-container-high rounded-lg mb-space-lg">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-space-sm px-space-md text-center rounded font-label-lg text-label-lg transition-all duration-200 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-space-sm px-space-md text-center rounded font-label-lg text-label-lg transition-all duration-200 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Đăng ký
            </button>
            <button
              onClick={() => setActiveTab('forgot')}
              className={`flex-1 py-space-sm px-space-md text-center rounded font-label-lg text-label-lg transition-all duration-200 cursor-pointer ${
                activeTab === 'forgot'
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Quên mật khẩu
            </button>
          </div>

          {/* Toast Alert */}
          {toastMsg && (
            <div className="mb-space-md p-space-sm rounded-lg bg-primary-fixed text-primary font-label-sm text-label-sm flex items-center gap-1.5 animate-bounce">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>{toastMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN FORM */}
          {activeTab === 'login' && (
            <form className="flex flex-col gap-space-md" onSubmit={handleLoginSubmit}>
              <div className="space-y-1">
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                  Chào mừng trở lại
                </h2>
                <p className="font-body-sm text-body-sm text-secondary">
                  Vui lòng nhập định danh tài khoản vận hành Aura Café
                </p>
              </div>

              <div className="space-y-space-xs mt-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-medium block">
                  Số điện thoại đăng nhập
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-space-md text-secondary pointer-events-none text-[20px]">
                    phone_iphone
                  </span>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    required
                    placeholder="VD: 0908123456"
                    className="w-full h-11 pl-11 pr-space-md bg-surface-container-low rounded text-on-surface placeholder:text-secondary/60 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all border-0"
                  />
                </div>
              </div>

              <div className="space-y-space-xs">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-label-md text-on-surface font-medium block">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('forgot')}
                    className="font-label-sm text-label-sm text-primary hover:underline cursor-pointer"
                  >
                    Cần trợ giúp?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-space-md text-secondary pointer-events-none text-[20px]">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full h-11 pl-11 pr-11 bg-surface-container-low rounded text-on-surface placeholder:text-secondary/60 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all border-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-space-md text-secondary hover:text-on-surface flex items-center justify-center cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between py-space-xs">
                <label className="flex items-center gap-space-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded text-primary-container accent-primary-container cursor-pointer"
                  />
                  <span className="font-body-sm text-body-sm text-secondary">
                    Ghi nhớ phiên đăng nhập trên thiết bị này
                  </span>
                </label>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                className="w-full h-12 bg-primary-container hover:bg-primary text-white rounded font-label-lg text-label-lg font-semibold flex items-center justify-center gap-space-sm shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>Đăng nhập hệ thống</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-space-xs">
                <div className="w-full h-px bg-surface-container-highest" />
                <span className="absolute px-space-md bg-surface-container-lowest font-label-sm text-label-sm text-secondary uppercase tracking-wider">
                  Hoặc tiếp tục với
                </span>
              </div>

              {/* Fast auth buttons */}
              <div className="grid grid-cols-2 gap-space-md">
                <button
                  type="button"
                  onClick={() => {
                    triggerToast('Đã liên kết phiên xác thực Google Workspace!');
                    setTimeout(() => {
                      if (onLoginSuccess) onLoginSuccess({ name: 'Google User', role: 'CUSTOMER' });
                      onClose();
                    }, 600);
                  }}
                  className="h-11 px-space-md bg-surface-container-low hover:bg-surface-container rounded flex items-center justify-center gap-space-sm font-label-md text-label-md text-on-surface transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.93 6.72-4.93z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Đăng nhập với Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerToast('Mã OTP 6 số đã được gửi qua SMS tới 0908 123 456!')}
                  className="h-11 px-space-md bg-surface-container-low hover:bg-surface-container rounded flex items-center justify-center gap-space-sm font-label-md text-label-md text-on-surface transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px] text-primary">sms</span>
                  <span>Mã OTP SMS</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTER FORM */}
          {activeTab === 'register' && (
            <form className="flex flex-col gap-space-md" onSubmit={handleRegisterSubmit}>
              <div className="space-y-1">
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                  Tạo tài khoản Aura
                </h2>
                <p className="font-body-sm text-body-sm text-secondary">
                  Đăng ký tài khoản nội bộ chi nhánh hoặc khách hàng thành viên
                </p>
              </div>

              <div className="grid grid-cols-2 gap-space-md mt-space-xs">
                <div className="space-y-space-xs">
                  <label className="font-label-md text-label-md text-on-surface font-medium block">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full h-11 px-space-md bg-surface-container-low rounded text-on-surface placeholder:text-secondary/60 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 border-0"
                  />
                </div>
                <div className="space-y-space-xs">
                  <label className="font-label-md text-label-md text-on-surface font-medium block">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="0908xxxxxx"
                    className="w-full h-11 px-space-md bg-surface-container-low rounded text-on-surface placeholder:text-secondary/60 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 border-0"
                  />
                </div>
              </div>

              <div className="space-y-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-medium block">
                  Địa chỉ Email (Gmail)
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-space-md text-secondary text-[20px]">
                    alternate_email
                  </span>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="khachhang@gmail.com"
                    className="w-full h-11 pl-11 pr-space-md bg-surface-container-low rounded text-on-surface placeholder:text-secondary/60 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 border-0"
                  />
                </div>
              </div>

              <div className="space-y-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-medium block">
                  Mật khẩu bảo mật
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-space-md text-secondary text-[20px]">
                    key
                  </span>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự, có số và ký hiệu"
                    className="w-full h-11 pl-11 pr-11 bg-surface-container-low rounded text-on-surface placeholder:text-secondary/60 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 border-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-space-md text-secondary hover:text-on-surface cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showRegPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-space-sm pt-space-xs">
                <input
                  type="checkbox"
                  defaultChecked
                  required
                  id="terms-agree"
                  className="w-4 h-4 rounded text-primary-container accent-primary-container cursor-pointer"
                />
                <label htmlFor="terms-agree" className="font-body-sm text-body-sm text-secondary cursor-pointer">
                  Tôi đồng ý với{' '}
                  <span className="text-primary hover:underline">Quy chế bảo mật</span> và điều khoản vận hành nội bộ.
                </label>
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-primary-container hover:bg-primary text-white rounded font-label-lg text-label-lg font-semibold flex items-center justify-center gap-space-sm shadow-md transition-all mt-space-xs cursor-pointer"
              >
                <span>Tạo tài khoản mới</span>
                <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              </button>

              <div className="text-center mt-space-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="font-body-sm text-body-sm text-secondary hover:text-primary cursor-pointer"
                >
                  Đã có tài khoản? <span className="font-semibold text-primary">Đăng nhập ngay</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD FORM */}
          {activeTab === 'forgot' && (
            <form className="flex flex-col gap-space-md" onSubmit={handleForgotSubmit}>
              <div className="space-y-1">
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                  Khôi phục quyền truy cập
                </h2>
                <p className="font-body-sm text-body-sm text-secondary">
                  Hệ thống sẽ gửi liên kết khôi phục mật khẩu vào hòm thư Gmail của bạn
                </p>
              </div>

              <div className="space-y-space-xs mt-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-medium block">
                  Địa chỉ Email (Gmail)
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-space-md text-secondary text-[20px]">
                    mail
                  </span>
                  <input
                    type="email"
                    required
                    value={forgotInput}
                    onChange={(e) => setForgotInput(e.target.value)}
                    placeholder="khachhang@gmail.com"
                    className="w-full h-11 pl-11 pr-space-md bg-surface-container-low rounded text-on-surface placeholder:text-secondary/60 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 border-0"
                  />
                </div>
              </div>

              <div className="p-space-md bg-surface-container-low rounded-lg flex items-start gap-space-sm text-secondary font-body-sm text-body-sm">
                <span className="material-symbols-outlined text-[20px] text-primary shrink-0">
                  info
                </span>
                <span>
                  Đối với tài khoản Quản trị cấp cao (Admin), liên hệ bộ phận IT chi nhánh qua hotline 1900 6868 nếu không nhận được OTP.
                </span>
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-primary-container hover:bg-primary text-white rounded font-label-lg text-label-lg font-semibold flex items-center justify-center gap-space-sm shadow-md transition-all cursor-pointer"
              >
                <span>Gửi mã khôi phục</span>
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="w-full h-11 bg-surface-container-low hover:bg-surface-container rounded font-label-md text-label-md text-on-surface flex items-center justify-center gap-space-sm transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Quay lại Đăng nhập</span>
              </button>
            </form>
          )}

          {/* Operational Security Badge Footer */}
          <div className="mt-space-lg pt-space-md flex items-center justify-between text-secondary border-t border-surface-container-high">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[18px] text-secondary">
                verified_user
              </span>
              <span className="font-label-sm text-label-sm">Bảo mật mã hóa 256-bit SSL</span>
            </div>
            <div className="flex items-center gap-space-sm font-label-sm text-label-sm">
              <span className="hover:underline cursor-pointer">Hỗ trợ</span>
              <span>•</span>
              <span className="hover:underline cursor-pointer">Trợ giúp POS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
