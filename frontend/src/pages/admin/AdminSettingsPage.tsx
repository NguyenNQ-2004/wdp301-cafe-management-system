import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout, Field, Modal, PrimaryButton, inputCls } from './AdminUi';
import useAuthStore from '../../store/authStore';
import { shopApi } from '../../lib/shopApi';

type SettingKind = 'number' | 'text' | 'time';

interface SettingDefinition {
  key: string;
  label: string;
  kind: SettingKind;
  min?: number;
  max?: number;
}

interface SettingRecord {
  settingKey: string;
  settingValue: string;
  updatedAt?: string;
}

interface SettingsResponse {
  settings?: Record<string, string>;
  list?: SettingRecord[];
  message?: string;
}

const DEFAULT_SETTINGS: Record<string, string> = {
  freeship_threshold: '150000',
  delivery_fee: '18000',
  delivery_minutes: '30',
  points_step: '10',
  points_step_value: '2000',
  points_earn_unit: '1000',
  store_name: 'Aura Café',
  store_address: '28 Tràng Tiền, Hoàn Kiếm, Hà Nội',
  store_hotline: '1900 6868',
  shift_morning: '07:00-12:00',
  shift_afternoon: '12:00-17:00',
  shift_evening: '17:00-22:00'
};

const GROUPS: Array<{ title: string; settings: SettingDefinition[] }> = [
  {
    title: 'Giao hàng',
    settings: [
      { key: 'freeship_threshold', label: 'Miễn phí ship cho đơn từ (VNĐ)', kind: 'number', min: 0 },
      { key: 'delivery_fee', label: 'Phí giao hàng (VNĐ)', kind: 'number', min: 0 },
      { key: 'delivery_minutes', label: 'Thời gian giao dự kiến (phút)', kind: 'number', min: 1 }
    ]
  },
  {
    title: 'Tích điểm',
    settings: [
      { key: 'points_step', label: 'Bậc đổi điểm (điểm)', kind: 'number', min: 1 },
      { key: 'points_step_value', label: 'Giá trị mỗi bậc đổi (VNĐ)', kind: 'number', min: 0 },
      { key: 'points_earn_unit', label: 'Chi tiêu để được 1 điểm (VNĐ)', kind: 'number', min: 1 }
    ]
  },
  {
    title: 'Thông tin cửa hàng',
    settings: [
      { key: 'store_name', label: 'Tên cửa hàng', kind: 'text', max: 100 },
      { key: 'store_address', label: 'Địa chỉ', kind: 'text', max: 300 },
      { key: 'store_hotline', label: 'Hotline', kind: 'text', max: 30 }
    ]
  },
  {
    title: 'Ca làm việc',
    settings: [
      { key: 'shift_morning', label: 'Giờ ca sáng', kind: 'time' },
      { key: 'shift_afternoon', label: 'Giờ ca chiều', kind: 'time' },
      { key: 'shift_evening', label: 'Giờ ca tối', kind: 'time' }
    ]
  }
];

const KNOWN_KEYS = new Set(GROUPS.flatMap((group) => group.settings.map((setting) => setting.key)));

const displayKey = (key: string) => key
  .split('_')
  .filter(Boolean)
  .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
  .join(' ');

const formatUpdatedAt = (date?: string) => {
  if (!date) return 'Chưa có thời gian cập nhật';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Chưa có thời gian cập nhật';
  return `Cập nhật lúc ${new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(parsed)}`;
};

const normalizeSettings = (data: SettingsResponse) => {
  const values = data.settings || {};
  const updatedAt = Object.fromEntries(
    (data.list || []).map((setting) => [setting.settingKey, setting.updatedAt])
  ) as Record<string, string | undefined>;
  return { values, updatedAt };
};

async function getSettings(token: string) {
  return shopApi<SettingsResponse>('/api/shop-settings', { token });
}

async function getSettingsWithDefaults(token: string) {
  const current = await getSettings(token);
  const currentValues = current.settings || {};
  const missingDefaults = Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS).filter(([key]) => !(key in currentValues))
  );

  if (Object.keys(missingDefaults).length === 0) return current;

  await shopApi<SettingsResponse>('/api/shop-settings', {
    method: 'PUT',
    token,
    body: missingDefaults
  });
  return getSettings(token);
}

function validateSetting(definition: SettingDefinition | undefined, key: string, rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) return 'Giá trị không được để trống.';

  if (!definition) {
    if (!/^[a-z][a-z0-9_]{1,49}$/.test(key)) return 'Mã cài đặt phải viết thường, dùng chữ, số hoặc dấu gạch dưới.';
    if (value.length > 300) return 'Giá trị không được vượt quá 300 ký tự.';
    return null;
  }

  if (definition.kind === 'number') {
    if (!/^\d+$/.test(value)) return 'Vui lòng nhập số nguyên không âm.';
    if (definition.min !== undefined && Number(value) < definition.min) {
      return `Giá trị tối thiểu là ${definition.min}.`;
    }
  }

  if (definition.kind === 'time') {
    const match = /^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/.exec(value);
    if (!match) return 'Nhập giờ theo định dạng HH:mm-HH:mm.';
    const [, startHour, startMinute, endHour, endMinute] = match;
    const values = [startHour, endHour].map(Number);
    const minutes = [startMinute, endMinute].map(Number);
    if (values.some((hour) => hour > 23) || minutes.some((minute) => minute > 59)) {
      return 'Giờ ca không hợp lệ.';
    }
  }

  if (definition.max !== undefined && value.length > definition.max) {
    return `Giá trị không được vượt quá ${definition.max} ký tự.`;
  }
  return null;
}

export const AdminSettingsPage: React.FC = () => {
  const token = useAuthStore((state) => state.user?.token);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [savedSettings, setSavedSettings] = useState<Record<string, string>>({});
  const [updatedAt, setUpdatedAt] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const loadSettings = useCallback(async () => {
    if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    const data = await getSettings(token);
    const loaded = normalizeSettings(data);
    setSettings(loaded.values);
    setSavedSettings(loaded.values);
    setUpdatedAt(loaded.updatedAt);
  }, [token]);

  useEffect(() => {
    let active = true;
    if (!token) return;
    getSettingsWithDefaults(token)
      .then((data) => {
        if (!active) return;
        const loaded = normalizeSettings(data);
        setSettings(loaded.values);
        setSavedSettings(loaded.values);
        setUpdatedAt(loaded.updatedAt);
        setError('');
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Không tải được cài đặt cửa hàng.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const dirtyKeys = useMemo(
    () => Object.keys(settings).filter((key) => settings[key] !== savedSettings[key]),
    [savedSettings, settings]
  );
  const otherKeys = useMemo(
    () => Object.keys(settings).filter((key) => !KNOWN_KEYS.has(key)).sort(),
    [settings]
  );
  const visibleError = error || (!token ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : '');

  const updateValue = (key: string, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setValidationErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setError('');
    setSuccess('');
  };

  const saveChanges = async () => {
    if (!token || dirtyKeys.length === 0) return;
    const errors: Record<string, string> = {};
    dirtyKeys.forEach((key) => {
      const definition = GROUPS.flatMap((group) => group.settings).find((setting) => setting.key === key);
      const message = validateSetting(definition, key, settings[key] || '');
      if (message) errors[key] = message;
    });
    if (Object.keys(errors).length) {
      setValidationErrors(errors);
      setError('Vui lòng kiểm tra lại các giá trị chưa hợp lệ.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const changes = Object.fromEntries(dirtyKeys.map((key) => [key, settings[key].trim()]));
      const result = await shopApi<SettingsResponse>('/api/shop-settings', {
        method: 'PUT',
        token,
        body: changes
      });
      const returnedValues = result.settings || { ...savedSettings, ...changes };
      setSettings(returnedValues);
      setSavedSettings(returnedValues);
      setValidationErrors({});
      try {
        await loadSettings();
        setSuccess('Đã lưu các cài đặt cửa hàng.');
      } catch (refreshCause) {
        setError(`Đã lưu thành công nhưng chưa tải lại được thời gian cập nhật. ${refreshCause instanceof Error ? refreshCause.message : ''}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu cài đặt cửa hàng.');
    } finally {
      setSaving(false);
    }
  };

  const addSetting = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const key = newKey.trim();
    const value = newValue.trim();
    const keyError = !/^[a-z][a-z0-9_]{1,49}$/.test(key)
      ? 'Mã cài đặt phải bắt đầu bằng chữ thường và chỉ gồm chữ, số, dấu gạch dưới.'
      : (KNOWN_KEYS.has(key) || key in settings) ? 'Mã cài đặt đã tồn tại.' : '';
    const valueError = validateSetting(undefined, key, value) || '';
    setValidationErrors({ ...(keyError ? { newKey: keyError } : {}), ...(valueError ? { newValue: valueError } : {}) });
    if (keyError || valueError) return;

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await shopApi<SettingsResponse>('/api/shop-settings', {
        method: 'PUT',
        token,
        body: { [key]: value }
      });
      const returnedValues = result.settings || { ...settings, [key]: value };
      setSettings(returnedValues);
      setSavedSettings(returnedValues);
      setAddModalOpen(false);
      setNewKey('');
      setNewValue('');
      setValidationErrors({});
      try {
        await loadSettings();
        setSuccess(`Đã thêm cài đặt "${displayKey(key)}".`);
      } catch (refreshCause) {
        setError(`Đã thêm cài đặt nhưng chưa tải lại được thời gian cập nhật. ${refreshCause instanceof Error ? refreshCause.message : ''}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể thêm cài đặt mới.');
    } finally {
      setSaving(false);
    }
  };

  const renderSetting = (definition: SettingDefinition) => (
    <Field key={definition.key} label={definition.label} column={definition.key}>
      <input
        className={inputCls}
        type="text"
        inputMode={definition.kind === 'number' ? 'numeric' : undefined}
        value={settings[definition.key] ?? ''}
        onChange={(event) => updateValue(definition.key, event.target.value)}
        aria-label={definition.label}
        aria-invalid={Boolean(validationErrors[definition.key])}
        placeholder="Chưa thiết lập"
      />
      {validationErrors[definition.key] && <p className="text-[11px] text-rose-600">{validationErrors[definition.key]}</p>}
      <p className="text-[10px] text-stone-400">{formatUpdatedAt(updatedAt[definition.key])}</p>
    </Field>
  );

  return (
    <AdminLayout
      route="admin-settings"
      table="shop_settings"
      title="Cài đặt cửa hàng"
      subtitle="Các thông số dùng chung cho giao hàng, tích điểm, giờ ca và thông tin hiển thị trên hóa đơn."
      actions={
        <>
          <button
            type="button"
            onClick={() => { setAddModalOpen(true); setValidationErrors({}); }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#a00020] px-4 py-2.5 font-bold text-white shadow-xs transition-colors hover:bg-[#800020]"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Thêm khóa cài đặt
          </button>
          <PrimaryButton icon="save" disabled={saving || dirtyKeys.length === 0} onClick={() => void saveChanges()}>
            {saving ? 'Đang lưu...' : `Lưu thay đổi${dirtyKeys.length ? ` (${dirtyKeys.length})` : ''}`}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        {visibleError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{visibleError}</div>}
        {success && !error && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">{success}</div>}

        {loading && token ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">Đang tải cài đặt cửa hàng...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
              {GROUPS.map((group) => (
                <section key={group.title} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs sm:p-5">
                  <h2 className="mb-4 text-sm font-bold text-stone-900">{group.title}</h2>
                  <div className="space-y-4">
                    {group.settings.map(renderSetting)}
                  </div>
                </section>
              ))}
              {otherKeys.length > 0 && (
                <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs sm:p-5">
                  <h2 className="mb-4 text-sm font-bold text-stone-900">Cài đặt khác</h2>
                  <div className="space-y-4">
                    {otherKeys.map((key) => (
                      <Field key={key} label={displayKey(key)} column={key}>
                        <input
                          className={inputCls}
                          value={settings[key]}
                          onChange={(event) => updateValue(key, event.target.value)}
                          aria-label={displayKey(key)}
                          aria-invalid={Boolean(validationErrors[key])}
                        />
                        {validationErrors[key] && <p className="text-[11px] text-rose-600">{validationErrors[key]}</p>}
                        <p className="text-[10px] text-stone-400">{formatUpdatedAt(updatedAt[key])}</p>
                      </Field>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {dirtyKeys.length > 0 && (
              <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-[#efc4cc] bg-white/95 p-3 shadow-lg backdrop-blur">
                <span className="text-xs text-stone-600">{dirtyKeys.length} thay đổi chưa được lưu</span>
                <PrimaryButton icon="save" disabled={saving} onClick={() => void saveChanges()}>
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </PrimaryButton>
              </div>
            )}
          </>
        )}
      </div>

      {addModalOpen && (
        <Modal title="Thêm khóa cài đặt" onClose={() => { if (!saving) setAddModalOpen(false); }}>
          <form onSubmit={(event) => void addSetting(event)} className="space-y-4">
            <Field label="Mã cài đặt">
              <input
                className={inputCls}
                value={newKey}
                onChange={(event) => {
                  setNewKey(event.target.value.toLocaleLowerCase().replace(/[^a-z0-9_]/g, '_'));
                  setValidationErrors((current) => ({ ...current, newKey: '' }));
                }}
                placeholder="ví dụ: invoice_note"
                maxLength={50}
                aria-invalid={Boolean(validationErrors.newKey)}
              />
              {validationErrors.newKey && <p className="text-[11px] text-rose-600">{validationErrors.newKey}</p>}
              <p className="text-[10px] text-stone-400">Dùng chữ thường, số và dấu gạch dưới; khóa sẽ được lưu vào shop_settings.</p>
            </Field>
            <Field label="Giá trị">
              <input
                className={inputCls}
                value={newValue}
                onChange={(event) => {
                  setNewValue(event.target.value);
                  setValidationErrors((current) => ({ ...current, newValue: '' }));
                }}
                maxLength={300}
                aria-invalid={Boolean(validationErrors.newValue)}
              />
              {validationErrors.newValue && <p className="text-[11px] text-rose-600">{validationErrors.newValue}</p>}
            </Field>
            <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
              <button type="button" onClick={() => setAddModalOpen(false)} disabled={saving} className="rounded-xl bg-stone-100 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-200 disabled:opacity-50">Hủy</button>
              <PrimaryButton type="submit" icon="add" disabled={saving}>{saving ? 'Đang thêm...' : 'Thêm cài đặt'}</PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
};

export default AdminSettingsPage;
