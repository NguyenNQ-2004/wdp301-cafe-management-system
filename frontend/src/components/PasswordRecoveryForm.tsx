import { useState } from 'react';
import type { FormEvent } from 'react';
import { shopApi } from '../lib/shopApi';
import { passwordError } from '../lib/authCredentials';

export default function PasswordRecoveryForm({ onLogin }: { onLogin: () => void }) {
  const [step, setStep] = useState<'email' | 'otp' | 'reset' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendAfter, setResendAfter] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const input = 'mt-2 h-11 w-full rounded border border-stone-200 bg-surface-container-low px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20';
  const send = async () => {
    const data = await shopApi<{ challenge: string; message: string }>('/api/auth/forgot-password', { method: 'POST', body: { email } });
    setChallenge(data.challenge); setNotice(data.message); setOtp(''); setStep('otp'); setResendAfter(Date.now() + 60000);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (step === 'email') await send();
      if (step === 'otp') {
        const data = await shopApi<{ resetToken: string; message: string }>('/api/auth/verify-otp', { method: 'POST', body: { challenge, otp } });
        setResetToken(data.resetToken); setNotice(data.message); setStep('reset'); setOtp('');
      }
      if (step === 'reset') {
        const passwordValidationError = passwordError(password);
        if (passwordValidationError) throw new Error(passwordValidationError);
        if (password !== confirmation) throw new Error('Mật khẩu xác nhận không khớp.');
        const data = await shopApi<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: { resetToken, password, confirmPassword: confirmation } });
        setPassword(''); setConfirmation(''); setResetToken(''); setChallenge(''); setNotice(data.message); setStep('done');
      }
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    if (busy) return;
    if (Date.now() < resendAfter) { setError(`Vui lòng đợi ${Math.ceil((resendAfter - Date.now()) / 1000)} giây trước khi gửi lại.`); return; }
    setBusy(true); setError('');
    try { await send(); } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  };
  return <form onSubmit={submit} className="flex flex-col gap-space-md">
    <div><h2 className="text-xl font-semibold">{step === 'reset' ? 'Đặt mật khẩu mới' : step === 'done' ? 'Đã đổi mật khẩu' : 'Khôi phục quyền truy cập'}</h2><p className="mt-2 text-sm text-secondary">{step === 'email' ? 'Nhập email tài khoản để nhận mã OTP khôi phục mật khẩu.' : step === 'otp' ? `Nhập mã 6 chữ số gửi đến ${email}. Mã có hiệu lực 10 phút.` : step === 'reset' ? 'Mật khẩu mới cần có ít nhất 8 ký tự, gồm chữ và số.' : 'Bạn có thể đăng nhập bằng mật khẩu mới.'}</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {step === 'email' && <label className="text-sm font-medium">Địa chỉ email<input className={input} type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="khachhang@gmail.com" /></label>}
    {step === 'otp' && <><label className="text-sm font-medium">Mã OTP<input className={input} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={event => setOtp(event.target.value.replace(/\D/g, ''))} /></label><div className="flex justify-between text-sm"><button type="button" disabled={busy} onClick={() => void resend()} className="font-semibold text-primary">Gửi lại mã OTP</button><button type="button" disabled={busy} onClick={() => { setStep('email'); setError(''); setNotice(''); }}>Đổi email</button></div></>}
    {step === 'reset' && <><label className="text-sm font-medium">Mật khẩu mới<input className={input} type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label><label className="text-sm font-medium">Xác nhận mật khẩu<input className={input} type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label></>}
    {step !== 'done' && <button disabled={busy} className="h-12 rounded bg-primary text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang xử lý...' : step === 'email' ? 'Gửi mã khôi phục' : step === 'otp' ? 'Xác minh OTP' : 'Lưu mật khẩu mới'}</button>}
    <button type="button" onClick={onLogin} className="h-11 rounded bg-surface-container-low text-sm font-medium">Quay lại đăng nhập</button>
  </form>;
}
