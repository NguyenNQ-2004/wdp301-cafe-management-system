import React, { useState } from 'react';
import { loginCredentials, registrationPayload, validateRegistration } from '../lib/authCredentials';
import type { RegistrationErrors } from '../lib/authCredentials';
import PasswordRecoveryForm from './PasswordRecoveryForm';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'login' | 'register' | 'forgot';
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
  // [LG01] . Nút mắt đổi showPassword để hiện/ẩn mật khẩu đăng nhập, không thay chuỗi đã nhập.
  const [showRegPassword, setShowRegPassword] = useState(false);
  // [DK01] . Nút mắt đổi showRegPassword để hiện/ẩn ô mật khẩu đăng ký.
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // [LG01] . Ô Email hoặc số điện thoại gọi setLoginIdentifier khi nhập; giá trị được kiểm tra khi gửi form.
  const [loginIdentifier, setLoginIdentifier] = useState('');
  // [LG01] . Ô mật khẩu gọi setLoginPassword; dùng nguyên giá trị để so mật khẩu, không tự bỏ khoảng trắng.
  const [loginPassword, setLoginPassword] = useState('');
  // [DK01] . Họ tên cập nhật regName, khi gửi kiểm tra tên bằng chữ và các ký tự ngăn cách cho phép.
  const [regName, setRegName] = useState('');
  // [DK01] . Số điện thoại cập nhật regPhone; kiểm tra 9–15 chữ số và trùng tài khoản ở backend.
  const [regPhone, setRegPhone] = useState('');
  // [DK01] . Email cập nhật regEmail; chuẩn hóa chữ thường, kiểm tra định dạng và email đã đăng ký khi gửi.
  const [regEmail, setRegEmail] = useState('');
  // [DK01] . Mật khẩu cập nhật regPassword; cần ít nhất 8 ký tự, có chữ và số, không có khoảng trắng, tối đa 72 byte.
  const [regPassword, setRegPassword] = useState('');
  // [DK01] . Ô xác nhận cập nhật confirmPassword, phải trùng regPassword.
  const [confirmPassword, setConfirmPassword] = useState('');
  // [DK01] . Ô đồng ý điều khoản cập nhật termsAccepted; bỏ chọn thì validateRegistration() báo lỗi.
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [registerSubmitted, setRegisterSubmitted] = useState(false);
  const [registerServerErrors, setRegisterServerErrors] = useState<RegistrationErrors>({});
  const registerInput = { fullName: regName, phone: regPhone, email: regEmail, password: regPassword, confirmPassword, termsAccepted };
  // [DK02] . Ghép lỗi backend và lỗi tại giao diện theo từng ô sau lần gửi form.
  const registerErrors = { ...registerServerErrors, ...(registerSubmitted ? validateRegistration(registerInput) : {}) };
  const clearRegisterError = (field: keyof RegistrationErrors) => {
    setRegisterError('');
    setRegisterServerErrors(current => { const next = { ...current }; delete next[field]; if (field === 'password') delete next.confirmPassword; return next; });
  };
  const registerField = (field: keyof RegistrationErrors) => ({ id: `register-${field}`, 'aria-invalid': !!registerErrors[field], 'aria-describedby': registerErrors[field] ? `register-${field}-error` : undefined });
  // [DK02] .. Ô sai được tô viền đỏ, thông báo nằm ngay bên dưới.
  const registerBorder = (field: keyof RegistrationErrors) => registerErrors[field] ? ' !border !border-red-500 !bg-red-50 focus:!ring-red-200' : '';
  const registerFieldError = (field: keyof RegistrationErrors) => registerErrors[field] ? <p id={`register-${field}-error`} role="alert" className="text-xs text-red-700">{registerErrors[field]}</p> : null;

  if (!isOpen) return null;

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    // [LG01] . Lấy email hoặc số điện thoại và mật khẩu người dùng nhập; chặn gửi lặp khi đang đăng nhập.
    // [LG01] ... Kiểm tra định dạng email hoặc số điện thoại và mật khẩu còn trống. [LG02]
    e.preventDefault();
    if (isLoggingIn) return;
    setLoginError('');
    let credentials;
    try { credentials = loginCredentials(loginIdentifier, loginPassword); }
    catch (error) { setLoginError((error as Error).message); return; }
    setIsLoggingIn(true);
    try {
      // [LG03] . Gửi email hoặc số điện thoại và mật khẩu bằng POST /api/auth/login.
      // [LG03] ... Tiếp nhận yêu cầu đăng nhập. [LG04]
      const response = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      // [LG09] . Đọc phản hồi API; nếu đăng nhập thất bại thì hiện thông báo và không lưu phiên.
      const data = await response.json();

      if (!response.ok) {
        setLoginError(response.status === 401
          ? 'Email, số điện thoại hoặc mật khẩu không đúng. Mật khẩu phân biệt chữ hoa và chữ thường.'
          : data.message || 'Không thể đăng nhập. Vui lòng thử lại.');
        return;
      }

      // [LG09] ... Chuyển thông tin tài khoản và token để chuẩn bị lưu phiên đăng nhập. [LG10]
      onLoginSuccess?.({ name: data.fullName, role: data.role, ...data });
      onClose();
    } catch {
      setLoginError('Không kết nối được API. Kiểm tra backend đang chạy ở cổng 5000.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    // [DK01] . Nhận form đăng ký, chặn gửi lặp và bật lỗi từng ô.
    // [DK01] ... Kiểm tra thông tin đăng ký. [DK02]
    e.preventDefault();
    if (isRegistering) return;
    setRegisterError('');
    setRegisterSubmitted(true);
    setRegisterServerErrors({});
    if (Object.keys(validateRegistration(registerInput)).length) return;
    const payload = registrationPayload(registerInput);
    setIsRegistering(true);
    try {
      // [DK04] . Gửi thông tin đăng ký và xác nhận mật khẩu.
      // [DK04] ... Tiếp nhận yêu cầu đăng ký. [DK05]
      const response = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, confirmPassword }),
      });

      const data = await response.json();

      // [DK11] . Nhận kết quả, gắn lỗi vào ô tương ứng hoặc hiện lỗi chung.
      if (!response.ok) {
        if (data.errors && typeof data.errors === 'object') setRegisterServerErrors(data.errors);
        else if (/đã.*(đăng ký|sử dụng)/i.test(data.message || '') && /email/i.test(data.message)) setRegisterServerErrors({ email: data.message });
        else if (/đã.*(đăng ký|sử dụng)/i.test(data.message || '') && /điện thoại/i.test(data.message)) setRegisterServerErrors({ phone: data.message });
        else setRegisterError(data.message || 'Không thể đăng ký. Vui lòng thử lại.');
        return;
      }

      // [DK11] .. Đăng ký xong, điền sẵn email và mở tab đăng nhập, chưa tự đăng nhập.
      // [DK11] ... Tiếp tục khi người dùng gửi form đăng nhập. [LG01]
      triggerToast('Đăng ký thành công! Hãy đăng nhập bằng Gmail và mật khẩu vừa tạo.');
      setLoginIdentifier(payload.email);
      setLoginPassword('');
      setRegPassword('');
      setConfirmPassword('');
      setRegisterSubmitted(false);
      setRegisterServerErrors({});
      setLoginError('');
      setActiveTab('login');
    } catch {
      setRegisterError('Không kết nối được máy chủ. Vui lòng thử lại.');
    } finally { setIsRegistering(false); }
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
          {/* [LG00] . Các tab chỉ đổi activeTab để chọn form, chưa gửi API. */}
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
          {/* [LG01] . Nhập tài khoản và mật khẩu vào state; nút Đăng nhập hệ thống hoặc Enter gửi form này. */}
          {activeTab === 'login' && (
            <form className="flex flex-col gap-space-md" onSubmit={handleLoginSubmit}>
              <div className="space-y-1">
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                  Chào mừng trở lại
                </h2>
                <p className="font-body-sm text-body-sm text-secondary">
                  Đăng nhập bằng email hoặc số điện thoại
                </p>
              </div>

              {loginError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-relaxed text-red-700">{loginError}</p>}

              <div className="space-y-space-xs mt-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-medium block">
                    Email hoặc số điện thoại
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-space-md text-secondary pointer-events-none text-[20px]">
                    alternate_email
                  </span>
                  <input
                    type="text"
                    name="identifier"
                    autoComplete="username"
                    inputMode="text"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    required
                    placeholder="Email hoặc số điện thoại"
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
              {/* [LG01] . Ô ghi nhớ hiện chỉ có trạng thái mặc định, chưa điều khiển cách lưu phiên. */}
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
          {/* [DK01] . Các ô cập nhật state và xóa lỗi backend của ô đang sửa; nút Tạo tài khoản mới gửi form này. */}
          {activeTab === 'register' && (
            <form noValidate className="flex flex-col gap-space-md" onSubmit={handleRegisterSubmit}>
              <div className="space-y-1">
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">
                  Tạo tài khoản Aura
                </h2>
                <p className="font-body-sm text-body-sm text-secondary">
                  Dùng email hoặc số điện thoại đã đăng ký để đăng nhập.
                </p>
              </div>

              {registerError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{registerError}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md mt-space-xs">
                <div className="space-y-space-xs">
                  <label htmlFor="register-fullName" className="font-label-md text-label-md text-on-surface font-medium block">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    required
                    name="fullName"
                    {...registerField('fullName')}
                    autoComplete="name"
                    value={regName}
                    onChange={(e) => { setRegName(e.target.value); clearRegisterError('fullName'); }}
                    placeholder="Nguyễn Văn A"
                    className={'w-full h-11 px-space-md bg-surface-container-low rounded text-on-surface placeholder:text-secondary/60 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 border-0' + registerBorder('fullName')}
                  />
                  {registerFieldError('fullName')}
                </div>
                <div className="space-y-space-xs">
                  <label htmlFor="register-phone" className="font-label-md text-label-md text-on-surface font-medium block">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="tel"
                    required
                    name="phone"
                    {...registerField('phone')}
                    autoComplete="tel"
                    value={regPhone}
                    onChange={(e) => { setRegPhone(e.target.value); clearRegisterError('phone'); }}
                    placeholder="0908xxxxxx"
                    className={'w-full h-11 px-space-md bg-surface-container-low rounded text-on-surface placeholder:text-secondary/60 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 border-0' + registerBorder('phone')}
                  />
                  {registerFieldError('phone')}
                </div>
              </div>

              <div className="space-y-space-xs">
                <label htmlFor="register-email" className="font-label-md text-label-md text-on-surface font-medium block">
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
                    {...registerField('email')}
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => { setRegEmail(e.target.value); clearRegisterError('email'); }}
                    placeholder="khachhang@gmail.com"
                    className={'w-full h-11 pl-11 pr-space-md bg-surface-container-low rounded text-on-surface placeholder:text-secondary/60 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 border-0' + registerBorder('email')}
                  />
                </div>
                {registerFieldError('email')}
              </div>

              <div className="space-y-space-xs">
                <label htmlFor="register-password" className="font-label-md text-label-md text-on-surface font-medium block">
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
                    {...registerField('password')}
                    autoComplete="new-password"
                    value={regPassword}
                    onChange={(e) => { setRegPassword(e.target.value); clearRegisterError('password'); }}
                    minLength={8}
                    placeholder="Mật khẩu tối thiểu 8 ký tự, gồm chữ và số"
                    className={'w-full h-11 pl-11 pr-11 bg-surface-container-low rounded text-on-surface placeholder:text-secondary/60 font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container/20 border-0' + registerBorder('password')}
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

              {registerFieldError('password')}
              <div>
                <label htmlFor="register-confirmPassword" className="block text-sm font-medium">Xác nhận mật khẩu</label>
                <input {...registerField('confirmPassword')} type="password" name="confirmPassword" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={event => { setConfirmPassword(event.target.value); clearRegisterError('confirmPassword'); }} className={'mt-2 w-full h-11 rounded bg-surface-container-low px-3' + registerBorder('confirmPassword')} />
                {registerFieldError('confirmPassword')}
              </div>
              <div className="flex items-center gap-space-sm pt-space-xs">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={event => { setTermsAccepted(event.target.checked); clearRegisterError('termsAccepted'); }}
                  required
                  id="terms-agree"
                  aria-invalid={!!registerErrors.termsAccepted}
                  aria-describedby={registerErrors.termsAccepted ? 'register-termsAccepted-error' : undefined}
                  className={'w-4 h-4 rounded text-primary-container accent-primary-container cursor-pointer' + registerBorder('termsAccepted')}
                />
                <label htmlFor="terms-agree" className="font-body-sm text-body-sm text-secondary cursor-pointer">
                  Tôi đồng ý với{' '}
                  <span className="text-primary hover:underline">Quy chế bảo mật</span> và điều khoản vận hành nội bộ.
                </label>
              </div>
              {registerFieldError('termsAccepted')}

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
            <PasswordRecoveryForm onLogin={() => setActiveTab('login')} />
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
