import React from 'react';
import type { PageRoute } from '../types';

interface FooterProps {
  onNavigate?: (route: PageRoute) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full bg-surface-container-lowest border-t border-surface-container-highest">
      <div className="w-full px-margin-lg py-space-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter-lg">
        {/* Col 1: Brand Info */}
        <div className="flex flex-col gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <span className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[18px]">local_cafe</span>
            </span>
            <span className="font-headline-sm text-headline-sm text-primary font-bold">
              Aura Café
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
            Hệ thống cà phê đặc sản và không gian làm việc chuyên nghiệp, phục vụ trọn vẹn từng khoảnh khắc cảm hứng của bạn.
          </p>
          <div className="flex items-center gap-space-sm mt-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant">Hotline hỗ trợ:</span>
            <a
              href="tel:19006868"
              className="font-headline-sm text-headline-sm text-primary tabular-data font-bold hover:underline cursor-pointer"
            >
              1900 6868
            </a>
          </div>
        </div>

        {/* Col 2: Chi nhánh */}
        <div className="flex flex-col gap-space-sm">
          <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Hệ thống chi nhánh
          </h4>
          <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
            <li className="flex items-start gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">location_on</span>
              <span>Chi nhánh 01: 28 Phố Tràng Tiền, Hoàn Kiếm, Hà Nội</span>
            </li>
            <li className="flex items-start gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">location_on</span>
              <span>Chi nhánh 02: 120 Hoàng Hoa Thám, Ba Đình, Hà Nội</span>
            </li>
            <li className="flex items-start gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">location_on</span>
              <span>Chi nhánh 03: 45 Lê Duẩn, Bến Nghé, Quận 1, TP. HCM</span>
            </li>
            <li className="flex items-start gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">location_on</span>
              <span>Chi nhánh 04: 88 Thảo Điền, TP. Thủ Đức, TP. HCM</span>
            </li>
          </ul>
        </div>

        {/* Col 3: Chính sách & Dịch vụ */}
        <div className="flex flex-col gap-space-sm">
          <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Chính sách & Dịch vụ
          </h4>
          <ul className="flex flex-col gap-space-xs font-body-md text-body-md text-on-surface-variant">
            <li>
              <button
                onClick={() => onNavigate && onNavigate('profile')}
                className="hover:text-primary transition-colors text-left cursor-pointer"
              >
                Quy chế hoạt động Aura Rewards
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate && onNavigate('checkout')}
                className="hover:text-primary transition-colors text-left cursor-pointer"
              >
                Chính sách giao hàng nội thành
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate && onNavigate('profile')}
                className="hover:text-primary transition-colors text-left cursor-pointer"
              >
                Chính sách bảo mật thông tin
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate && onNavigate('feedback')}
                className="hover:text-primary transition-colors text-left cursor-pointer"
              >
                Quy trình xử lý phản ánh & khiếu nại
              </button>
            </li>
          </ul>
        </div>

        {/* Col 4: Giờ mở cửa */}
        <div className="flex flex-col gap-space-sm">
          <h4 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Giờ mở cửa
          </h4>
          <div className="flex flex-col gap-space-xs font-body-md text-body-md text-on-surface-variant">
            <div className="flex justify-between border-b border-surface-container py-space-xs">
              <span>Thứ Hai - Thứ Sáu:</span>
              <span className="font-tabular-data text-tabular-data font-semibold text-on-surface">
                07:00 - 22:30
              </span>
            </div>
            <div className="flex justify-between border-b border-surface-container py-space-xs">
              <span>Thứ Bảy - Chủ Nhật:</span>
              <span className="font-tabular-data text-tabular-data font-semibold text-on-surface">
                06:30 - 23:00
              </span>
            </div>
            <div className="mt-space-sm p-space-sm bg-surface rounded-lg border border-surface-container-highest">
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Phục vụ đơn mang về và giao hàng tận nơi qua hotline và ứng dụng.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subfooter */}
      <div className="w-full px-margin-lg py-space-md border-t border-surface-container-highest flex flex-col md:flex-row items-center justify-between gap-space-md">
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          © 2024 Aura Café CMS. Bản quyền thuộc về Aura Specialty Coffee JSC.
        </span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Phiên bản Khách Hàng v2.4
        </span>
      </div>
    </footer>
  );
};
