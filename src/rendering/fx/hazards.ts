/** Mối nguy của chế độ vô tận: từ màn 21, mỗi màn thêm một mối nguy cho đến hết lượt chơi. */
export const HAZARD_FROM = 21;

export interface Hazard {
  id: string;
  name: string;
  desc: string;
}

export const HAZARDS: Hazard[] = [
  { id: 'cuong_no', name: 'Cuồng Nộ', desc: 'Quái chạy nhanh hơn 20%.' },
  { id: 'giap_sat', name: 'Giáp Sắt', desc: 'Quái nhiều máu hơn 35%.' },
  { id: 'doc_dia', name: 'Độc Địa', desc: 'Quái gây sát thương nhiều hơn 30%.' },
  { id: 'tinh_anh_hoa', name: 'Tinh Anh Hóa', desc: 'Nhiều quái tinh anh hơn.' },
  { id: 'su_kien_day', name: 'Thiên Tai Dồn Dập', desc: 'Sự kiện bản đồ xảy ra dày gấp đôi.' },
  { id: 'kiet_suc', name: 'Kiệt Sức', desc: 'Không hồi máu giữa màn, bánh chưng không còn rơi.' },
];

export function hazardById(id: string): Hazard | undefined {
  return HAZARDS.find((h) => h.id === id);
}

/** Dòng chữ hiển thị các mối nguy đang có, rỗng nếu chưa có. */
export function hazardText(ids: string[]): string {
  return ids.length ? `Mối nguy: ${ids.map((i) => hazardById(i)?.name ?? i).join(', ')} (+${ids.length * 10}% vàng)` : '';
}
