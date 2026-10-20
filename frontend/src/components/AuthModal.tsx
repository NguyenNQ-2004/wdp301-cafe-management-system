import React, { useState } from 'react';
import { loginCredentials, registrationPayload } from '../lib/authCredentials';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'login' | 'register';
  onClose: () => void;
  onLoginSuccess?: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'login',
  onClose,
  onLoginSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
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
    if (isLoggingIn) return;
    setLoginError('');
    let credentials;
    try { credentials = loginCredentials(loginIdentifier, loginPassword); }
    catch (error) { setLoginError((error as Error).message); return; }
    setIsLoggingIn(true);
    try {
      const response = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        setLoginError(response.status === 401
          ? 'Gmail/email hoặc mật khẩu không đúng. Mật khẩu phân biệt chữ hoa và chữ thường.'
          : data.message || 'Không thể đăng nhập. Vui lòng thử lại.');
        return;
      }

      onLoginSuccess?.({ name: data.fullName, role: data.role, ...data });
      onClose();
    } catch {
      setLoginError('Không kết nối được API. Kiểm tra backend đang chạy ở cổng 5000.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) return;
    setRegisterError('');
    let payload;
    try { payload = registrationPayload({ fullName: regName, phone: regPhone, email: regEmail, password: regPassword }); }
    catch (error) { setRegisterError((error as Error).message); return; }
    setIsRegistering(true);
    try {
      const response = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setRegisterError(data.message || 'Không thể đăng ký. Vui lòng kiểm tra Gmail và số điện thoại liên hệ.');
        return;
      }

      triggerToast('Đăng ký thành công! Hãy đăng nhập bằng Gmail và mật khẩu vừa tạo.');
      setLoginIdentifier(payload.email);
      setLoginPassword('');
      setRegPassword('');
      setLoginError('');
      setActiveTab('login');
    } catch {
      setRegisterError('Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally { setIsRegistering(false); }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast('Khôi phục mật khẩu qua email chưa được hỗ trợ. Vui lòng liên hệ quản trị viên để được trợ giúp.');
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={activeTab === 'register' ? 'Đăng ký tài khoản' : activeTab === 'login' ? 'Đăng nhập tài khoản' : 'Khôi phục mật khẩu'} className="fixed inset-0 z-[100] flex items-center justify-center p-gutter md:p-gutter-lg bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Container card */}
      <div className="max-h-[90dvh] w-full max-w-4xl bg-surface-container-lowest rounded-xl shadow-2xl overflow-y-auto flex flex-col md:flex-row relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors cursor-pointer"
          title="Đóng"
          aria-label="Đóng form tài khoản"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Left Atmospheric Brand Showcase (Visual Richness) */}
        <div className="relative hidden w-5/12 shrink-0 bg-surface-container p-space-xl md:flex flex-col justify-between overflow-hidden min-h-[580px]">
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
              className={`flex-1 py-space-sm px-space-md text-center rounded font-label-lg text-label-lg transition-all duration-200 cursor-pointer ${activeTab === 'login'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                : 'text-secondary hover:text-on-surface'
                }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => setActiveTab('register')}
              className={`flex-1 py-space-sm px-space-md text-center rounded font-label-lg text-label-lg transition-all duration-200 cursor-pointer ${activeTab === 'register'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                : 'text-secondary hover:text-on-surface'
                }`}
            >
              Đăng ký
            </button>
            <button
              onClick={() => setActiveTab('forgot')}
              className={`flex-1 py-space-sm px-space-md text-center rounded font-label-lg text-label-lg transition-all duration-200 cursor-pointer ${activeTab === 'forgot'
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
                  Nhập Gmail và mật khẩu tài khoản Aura Café để tiếp tục
                </p>
              </div>

              {loginError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-relaxed text-red-700">{loginError}</p>}

              <div className="space-y-space-xs mt-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-medium block">
                  Gmail / Email đăng nhập
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-space-md text-secondary pointer-events-none text-[20px]">
                    alternate_email
                  </span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    required
                    placeholder="tenban@gmail.com"
                    className="w-full h-11 pl-11 pr-space-md bg-surface-container-low rounded text-on-surface placeholder:text-secondary/60 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 transition-all border-0"
                  />
                </div>
              </div>

              <div className="space-y-space-xs">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-label-md text-on-surface font-medium block">
                    Mật khẩu tài khoản Aura Café
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
                    name="password"
                    autoComplete="current-password"
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
                disabled={isLoggingIn}
                className="w-full h-12 bg-primary-container hover:bg-primary text-white rounded font-label-lg text-label-lg font-semibold flex items-center justify-center gap-space-sm shadow-md transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
              >
                <span>{isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập hệ thống'}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>

              <p className="text-center text-sm text-secondary">Dùng mật khẩu bạn đã tạo khi đăng ký tài khoản Aura Café.</p>
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
                  Dùng Gmail để đăng nhập; số điện thoại chỉ dùng cho thông tin liên hệ và giao hàng.
                </p>
              </div>

              {registerError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{registerError}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md mt-space-xs">
                <div className="space-y-space-xs">
                  <label className="font-label-md text-label-md text-on-surface font-medium block">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    required
                    name="fullName"
                    autoComplete="name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full h-11 px-space-md bg-surface-container-low rounded text-on-surface placeholder:text-secondary/60 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 border-0"
                  />
                </div>
                <div className="space-y-space-xs">
                  <label className="font-label-md text-label-md text-on-surface font-medium block">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="tel"
                    required
                    name="phone"
                    autoComplete="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="0908xxxxxx"
                    className="w-full h-11 px-space-md bg-surface-container-low rounded text-on-surface placeholder:text-secondary/60 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 border-0"
                  />
                </div>
              </div>

              <div className="space-y-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-medium block">
                  Gmail / Email đăng nhập
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-space-md text-secondary text-[20px]">
                    alternate_email
                  </span>
                  <input
                    type="email"
                    required
                    name="email"
                    autoComplete="email"
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
                    name="password"
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    minLength={8}
                    placeholder="Mật khẩu tài khoản Aura Café, tối thiểu 8 ký tự"
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
                disabled={isRegistering}
                className="w-full h-12 bg-primary-container hover:bg-primary text-white rounded font-label-lg text-label-lg font-semibold flex items-center justify-center gap-space-sm shadow-md transition-all mt-space-xs cursor-pointer"
              >
                <span>{isRegistering ? 'Đang đăng ký...' : 'Tạo tài khoản mới'}</span>
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
