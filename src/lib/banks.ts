// Danh sách ngân hàng VN (NAPAS BIN). Sort theo phổ biến.
// Nguồn: VietQR.io standard list.

export interface BankInfo {
  bin: string         // mã NAPAS BIN, dùng cho VietQR URL
  shortName: string   // hiển thị ngắn
  name: string        // tên đầy đủ
}

export const VN_BANKS: BankInfo[] = [
  { bin: '970436', shortName: 'Vietcombank',     name: 'NH TMCP Ngoại Thương Việt Nam' },
  { bin: '970415', shortName: 'VietinBank',      name: 'NH TMCP Công Thương Việt Nam' },
  { bin: '970418', shortName: 'BIDV',            name: 'NH TMCP Đầu tư và Phát triển VN' },
  { bin: '970405', shortName: 'Agribank',        name: 'NH NN&PTNT Việt Nam' },
  { bin: '970407', shortName: 'Techcombank',     name: 'NH TMCP Kỹ Thương Việt Nam' },
  { bin: '970416', shortName: 'ACB',             name: 'NH TMCP Á Châu' },
  { bin: '970432', shortName: 'VPBank',          name: 'NH TMCP Việt Nam Thịnh Vượng' },
  { bin: '970422', shortName: 'MB Bank',         name: 'NH TMCP Quân Đội' },
  { bin: '970423', shortName: 'TPBank',          name: 'NH TMCP Tiên Phong' },
  { bin: '970403', shortName: 'Sacombank',       name: 'NH TMCP Sài Gòn Thương Tín' },
  { bin: '970437', shortName: 'HDBank',          name: 'NH TMCP Phát Triển TP.HCM' },
  { bin: '970441', shortName: 'VIB',             name: 'NH TMCP Quốc Tế Việt Nam' },
  { bin: '970443', shortName: 'SHB',             name: 'NH TMCP Sài Gòn - Hà Nội' },
  { bin: '970431', shortName: 'Eximbank',        name: 'NH TMCP Xuất Nhập Khẩu Việt Nam' },
  { bin: '970449', shortName: 'LPBank',          name: 'NH TMCP Lộc Phát Việt Nam' },
  { bin: '970448', shortName: 'OCB',             name: 'NH TMCP Phương Đông' },
  { bin: '970426', shortName: 'MSB',             name: 'NH TMCP Hàng Hải Việt Nam' },
  { bin: '970440', shortName: 'SeABank',         name: 'NH TMCP Đông Nam Á' },
  { bin: '970409', shortName: 'BacABank',        name: 'NH TMCP Bắc Á' },
  { bin: '970425', shortName: 'ABBANK',          name: 'NH TMCP An Bình' },
  { bin: '970400', shortName: 'Saigonbank',      name: 'NH TMCP Sài Gòn Công Thương' },
  { bin: '970452', shortName: 'KienlongBank',    name: 'NH TMCP Kiên Long' },
  { bin: '970412', shortName: 'PVcomBank',       name: 'NH TMCP Đại Chúng Việt Nam' },
  { bin: '970406', shortName: 'DongA Bank',      name: 'NH TMCP Đông Á' },
  { bin: '970438', shortName: 'BaoVietBank',     name: 'NH TMCP Bảo Việt' },
  { bin: '970419', shortName: 'NCB',             name: 'NH TMCP Quốc Dân' },
  { bin: '970428', shortName: 'NamABank',        name: 'NH TMCP Nam Á' },
  { bin: '970427', shortName: 'VietABank',       name: 'NH TMCP Việt Á' },
  { bin: '970433', shortName: 'VietBank',        name: 'NH TMCP Việt Nam Thương Tín' },
  { bin: '970454', shortName: 'BVBank',          name: 'NH TMCP Bản Việt' },
  { bin: '970430', shortName: 'PGBank',          name: 'NH TMCP Thịnh Vượng và Phát Triển' },
  { bin: '970446', shortName: 'CoopBank',        name: 'NH HTX Việt Nam' },
  { bin: '546034', shortName: 'Cake',            name: 'Cake by VPBank' },
  { bin: '546035', shortName: 'Ubank',           name: 'Ubank by VPBank' },
  { bin: '963388', shortName: 'Timo',            name: 'Timo' },
  { bin: '970458', shortName: 'UOB',             name: 'NH UOB Việt Nam' },
  { bin: '970424', shortName: 'Shinhan',         name: 'NH Shinhan Việt Nam' },
  { bin: '970457', shortName: 'Woori',           name: 'NH Woori Việt Nam' },
  { bin: '970442', shortName: 'HongLeong',       name: 'NH Hong Leong Việt Nam' },
  { bin: '970410', shortName: 'StandardChartered', name: 'NH Standard Chartered VN' },
]

export function findBank(bin: string | undefined): BankInfo | undefined {
  if (!bin) return undefined
  return VN_BANKS.find(b => b.bin === bin)
}
