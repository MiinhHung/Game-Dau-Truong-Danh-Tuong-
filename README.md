# HỒN VIỆT 3D: Đấu Trường Danh Tướng

Game hành động 3D chạy trên trình duyệt, viết bằng Three.js, TypeScript và Vite. Chọn một danh tướng Việt Nam, cầm vũ khí vui nhộn (dép lào, ghế nhựa, nón lá, chổi chít, muôi canh, điếu cày, lợn...) đánh các đợt quái vật phương Tây, nhặt vàng và mua trang bị để đi xa hơn. Không cần backend, không cần API trả phí.

## Cài đặt và chạy

Yêu cầu Node.js 18 trở lên và trình duyệt có WebGL.

```bash
npm install
npm run dev        # chạy thử tại http://localhost:5173
```

| Lệnh | Tác dụng |
|---|---|
| `npm run build` | Kiểm tra kiểu TypeScript và đóng gói vào `dist/` |
| `npm run preview` | Chạy thử bản đã đóng gói |
| `npm run typecheck` | Chỉ kiểm tra kiểu |
| `npm run server` | Máy chủ độc lập phục vụ bản build và sảnh chơi cùng bạn bè (cổng 8787) |
| `npm run test:server` | Kiểm thử máy chủ sảnh và phòng |

## Luồng chơi

Chọn tướng, chọn vũ khí, vào trận đánh các đợt quái, nhặt vàng. Gục ngã thì vàng nhặt được vẫn được giữ lại. Về sảnh hoặc nhấn Esc giữa trận để mua trang bị, rồi quay lại đánh ở màn cao hơn.

## Điều khiển

| Phím | Chức năng |
|---|---|
| W A S D | Di chuyển |
| Chuột trái hoặc Space | Đánh về hướng con trỏ (giữ để đánh liên tục) |
| Shift | Lướt tránh đòn |
| Q | Chiêu cuối riêng của từng tướng (xem bảng bên dưới) |
| Cuộn chuột | Zoom gần hoặc xa (camera nhìn từ trên cao xuống) |
| E | Kỹ năng phụ riêng của từng tướng |
| M | Bật hoặc tắt âm nền |
| Z X C V | Nhắn nhanh trong co-op |
| 1, 2, 3 | Chọn thẻ nâng cấp khi lên cấp |
| Esc | Tạm dừng, mở cửa hàng và đổi vũ khí |

## 9 danh tướng

Mỗi tướng có chỉ số riêng (nội tại) và một **chiêu cuối riêng** bấm phím Q. Chiêu cuối và hồi chiêu hiện ở thẻ tướng trong sảnh.

| Tướng | Chiêu cuối | Hồi chiêu | Tác dụng |
|---|---|---|---|
| Trần Hưng Đạo | Thiên Quân Vạn Mã | 22 giây | Triệu hồi đạo quân hồn ma ào qua dải rộng theo hướng chuột, rồi quay lại: hai đợt quét sạch quái trên đường, gây sát thương lớn và hất tung |
| Quang Trung | Hỏa Nhai Thần Tốc | 20 giây | Cưỡi Voi Chiến mang đại bác, lao vút trong 2 giây, lái hướng bằng chuột hoặc WASD để tông địch, bất tử khi lao, đè nát và thiêu đốt mọi quái trên đường (cháy thêm 3 giây) |
| Lê Lợi | Bình Ngô Thuận Thiên | 28 giây | Vút Thuận Thiên Kiếm lên trời, Rồng Vàng giội kim quang 3 đợt sát thương lớn; quái chết vì chiêu này rơi gấp đôi vàng |
| Trưng Trắc | Mê Linh Triệu Hồi | 30 giây | Nổi cồng: sóng đồng làm choáng quái quanh mình, triệu hồi Voi Trắng (xông vào quái, giậm đất gây sát thương lan + choáng) và Trưng Nhị (bắn cung tự động) chiến đấu 15 giây |
| Ngô Quyền | Trận Đồ Bộc Phá | 24 giây | Chỉ chuột để chọn điểm rơi (tầm tối đa 20, có vòng chỉ định), giậm chân biến vùng đất quanh điểm đó thành đầm lầy 10 giây, hàng chục cây cọc nhọn trồi lên từ bùn: quái bên trong chậm đi 60% và bị cọc đâm mỗi giây |
| Bà Triệu | Đạp Luồng Sóng Dữ | 26 giây | 10 giây chạy nhanh hơn nhiều, miễn nhiễm khống chế, mỗi đòn đánh tạo sóng lốc xoáy lan rộng |
| Lý Thường Kiệt | Nam Quốc Sơn Hà | 28 giây | Ba vòng sóng âm kim sắc quét toàn màn hình gây sát thương phép lớn, quái Hoảng Sợ 5 giây (chạy toán loạn, không tấn công) |
| Nguyễn Trãi | Bình Ngô Đại Cáo | 30 giây | Đồng đội trong tầm 16 được hồi 15% máu, tăng 25% sát thương 8 giây và giảm sát thương nhận 3 giây; quái bị chấn động, hoảng sợ 2,5 giây và chậm đi |
| Phù Đổng Thiên Vương | Nhổ Tre Đằng Ngà | 26 giây | Nhổ bụi tre đằng ngà quật ba vòng quanh người (tầm 11, hất văng mạnh) rồi một đòn cuối tầm 14 làm choáng quái 1,5 giây |

Boss chỉ bị choáng rất ngắn và miễn nhiễm Hoảng Sợ. Chiêu của 6 tướng theo mô tả của bạn; riêng Trần Hưng Đạo (bạn chưa gửi mô tả) là thiết kế của mình. Có thể đổi trong `src/arena3d/data.ts` (mô tả, hồi chiêu) và các hàm `ult...` trong `src/arena3d/arena.ts` (hiệu ứng).

## 7 vũ khí dân dã

| Vũ khí | Kiểu đánh | Giá |
|---|---|---|
| Dép Lào Huyền Thoại | Tầm xa: phóng đôi dép bay ra rồi quay về như boomerang, xuyên quái | miễn phí |
| Ghế Nhựa Quốc Dân | Cận chiến diện rộng: đập ghế xuống đất, gây choáng quái phía trước 1 giây | miễn phí |
| Nón Lá Phi Tiêu | Tầm xa: phi nón lá xuyên tối đa 3 quái | 300 |
| Chổi Chít | Cận chiến, tầm quét rộng: quét một vòng, đầu chổi hạ sát sàn tung bụi, đẩy lùi mạnh và làm chậm 2 giây | 450 |
| Muôi Canh | Cận chiến: Cốc Đầu, 20% chí mạng gấp 2,5 lần | 550 |
| Điếu Cày Long Trượng | Tầm xa: phả khói gây sát thương, Say Khói 15% làm chậm 30% trong 2 giây và gây choáng | 750 |
| Phóng Lợn | Phóng lợn bay thẳng đâm xuyên, gây chảy máu theo % máu tối đa của quái (cộng dồn, tối đa 15 giây) | 800 |

Mỗi vũ khí nâng cấp được đến +5 bằng vàng.

## Lên cấp và thẻ nâng cấp

Hạ quái để nhận kinh nghiệm (thanh xanh dưới thanh máu). Mỗi lần lên cấp, chọn một trong ba thẻ ngẫu nhiên bằng phím 1, 2, 3 hoặc bấm chuột; thẻ chỉ có hiệu lực trong lượt chơi đó. Chơi một mình thì trận tạm dừng khi chọn, chơi nhiều người thì trận vẫn chạy. Người hạ quái nhận đủ kinh nghiệm, đồng đội còn sống nhận một nửa. Danh sách thẻ nằm ở `src/arena3d/cards.ts`:

| Thẻ | Tác dụng | Tối đa |
|---|---|---|
| Sức Mạnh | +12% sát thương | 8 |
| Tay Nhanh | +10% tốc độ đánh | 6 |
| Chân Gió | +8% tốc độ chạy | 5 |
| Thể Lực | +20 máu tối đa và hồi 20 máu | 6 |
| Mắt Đại Bàng | +8% chí mạng | 5 |
| Tay Hòm Chìa | +15% vàng nhận được | 5 |
| Giáp Mềm | Giảm thêm 6% sát thương nhận vào | 5 |
| Nội Công | Chiêu Q hồi nhanh hơn 10% | 5 |
| Hồi Phục | Tự hồi 0,6 máu mỗi giây | 5 |

## Combo, tiến hóa, nhiệm vụ và chế độ vô tận

- **Combo tướng và vũ khí:** mỗi tướng cầm đúng vũ khí hợp vía sẽ mạnh thêm (hiện ở thông tin tướng và dòng nhỏ dưới thanh kinh nghiệm): Trưng Trắc + Điếu Cày (Say Khói 35%, choáng 1,8 giây), Quang Trung + Dép Lào (dép làm quái cháy), Trần Hưng Đạo + Nón Lá (xuyên 5 quái), Lê Lợi + Muôi Canh (chí mạng 30%, gấp 3), Bà Triệu + Chổi Chít (rộng hơn 15%, làm chậm 65%), Ngô Quyền + Phóng Lợn (chảy máu tới 9%), Lý Thường Kiệt + Ghế Nhựa (choáng 1,6 giây). Danh sách ở `COMBOS` trong `src/arena3d/data.ts`.
- **Vũ khí tiến hóa:** nâng một vũ khí lên +5 thì nó phát ánh vàng (cả vũ khí cầm tay và đạn) và có thêm sức mạnh riêng, ghi ở thẻ vũ khí: Dép ném 3 chiếc, Nón phi 2 chiếc và xuyên thêm, Lợn phóng 2 con, Điếu Cày phả 2 cục khói xuyên 3 quái, Chổi quét thêm vòng thứ hai, Ghế đập rộng hơn, Muôi đánh nhanh hơn.
- **Nhiệm vụ ngày và thành tích:** tab **Nhiệm vụ** ở sảnh có 3 nhiệm vụ mỗi ngày (theo giờ máy), làm ở mọi lượt chơi trong ngày, bấm nhận vàng khi xong. Có 13 thành tích mở khóa tự động và tặng vàng một lần. Khi chơi nhiều người, tiến độ hạ quái của máy khách tính theo số quái của cả đội và nhiệm vụ "hạ loại quái cụ thể" chỉ tính ở chủ phòng. Mã ở `src/arena3d/quests.ts`.
- **Âm nền theo bản đồ:** tiếng gió, chim, mưa, sấm, lửa, tim đập, trống trận và vài nốt nhạc thưa, tạo bằng WebAudio, đổi theo bản đồ. Phím **M** bật hoặc tắt (nhớ lựa chọn). Mã ở `src/arena3d/ambience.ts`.
- **Chế độ vô tận:** từ màn 21, mỗi màn thêm một mối nguy cho đến hết lượt: Cuồng Nộ (quái nhanh hơn 20%), Giáp Sắt (máu quái +35%), Độc Địa (sát thương quái +30%), Tinh Anh Hóa (thêm quái tinh anh), Thiên Tai Dồn Dập (sự kiện bản đồ dày gấp đôi), Kiệt Sức (không hồi máu giữa màn, hết bánh chưng). Mỗi mối nguy cộng 10% vàng. Mã ở `src/arena3d/hazards.ts`.

## Kỹ năng phụ E, cứu đồng đội, nhắn nhanh và cài đặt

Mỗi tướng có thêm một kỹ năng phụ **E** hồi nhanh hơn chiêu Q (dữ liệu `ESKILLS` trong `src/arena3d/data.ts`):

| Tướng | Kỹ năng E | Tác dụng | Hồi |
|---|---|---|---|
| Trần Hưng Đạo | Hịch Tướng Sĩ | Cả đội trong tầm 14 tăng 25% sát thương trong 6 giây | 14 giây |
| Quang Trung | Hỏa Pháo | Đại bác nổ vùng phía trước, đốt cháy quái 3 giây | 9 giây |
| Lê Lợi | Kim Quang Hộ Thể | Giảm 60% sát thương nhận vào trong 4 giây | 16 giây |
| Trưng Trắc | Cồng Mê Linh | Hồi 30% máu tối đa cho bạn và đồng đội trong tầm 10 | 18 giây |
| Bà Triệu | Cuồng Phong | Hai vòng lốc xoáy liên tiếp, làm choáng quái 1 giây | 9 giây |
| Ngô Quyền | Cọc Nhọn | Cắm cọc tại điểm chuột chỉ, gây sát thương và choáng 1,2 giây | 11 giây |
| Lý Thường Kiệt | Sóng Âm Đẩy Lùi | Đẩy lùi mạnh quái trong tầm 9, làm chậm 50% và hoảng sợ 1 giây | 10 giây |
| Nguyễn Trãi | Mưu Kế Phục Binh | Đặt bẫy tại điểm chuột chỉ (tầm 18): quái trong vùng bị sát thương, choáng 1,5 giây và chậm 50% trong 3 giây | 13 giây |
| Phù Đổng Thiên Vương | Roi Sắt Quét | Vung roi sắt quét cung phía trước tầm 9, hất văng và làm choáng quái 0,6 giây | 10 giây |

Thẻ Nội Công cũng rút ngắn hồi chiêu E.

- **Cứu đồng đội:** khi chơi nhiều người, đồng đội còn sống đứng cạnh người gục (trong 3,4 đơn vị) 3 giây thì cứu được, người đó hồi 40% máu và bất tử 2,5 giây. Vòng xanh lá to dần báo tiến độ. Hết màn thì mọi người vẫn được hồi sinh như trước.
- **Nhắn nhanh:** khi chơi cùng bạn bè, nhấn **Z** (Theo tôi!), **X** (Cần hồi máu!), **C** (Cẩn thận!), **V** (Được!), chữ nổi trên đầu nhân vật cho cả phòng thấy.
- **Cài đặt:** tab **Cài đặt** ở sảnh và trong menu tạm dừng (Esc): âm lượng hiệu ứng, nhạc nền và độ xa camera. Tự lưu cho lần chơi sau. Mã ở `src/arena3d/settings.ts`.

## Bản đồ và bản đồ nhỏ

Sân đấu rộng gấp khoảng 1,7 lần (bán kính 72). Góc trên bên phải có bản đồ nhỏ: mũi tên trắng viền vàng là bạn (chỉ hướng nhìn), chấm xanh lam là đồng đội, chấm đỏ là quái, chấm cam lớn là boss, hình tròn xám mờ là vật cản.

Mỗi màn đổi sang một bản đồ khác, có thời tiết, ánh sáng và quái vật ưu tiên riêng (dữ liệu ở `src/arena3d/biomes.ts`):

| Bản đồ | Hiệu ứng | Quái xuất hiện nhiều |
|---|---|---|
| Làng Trống Đồng | Ban ngày, phấn hoa và lá tre bay | Goblin, bù nhìn ma, xác sống |
| Nghĩa Địa Sương Mù | Đêm tím, sương dày, ma trơi, trăng nhợt | Bộ xương, bóng ma |
| Rừng Trăng Máu | Trăng đỏ khổng lồ, dơi bay, đom đóm đỏ | Người sói, ma cà rồng |
| Đồi Giông Bão | Mưa xối, sét đánh chớp sáng, tháp Tesla phóng điện | Quái nhân Frankenstein, xác sống |
| Cao Nguyên Băng Giá | Tuyết rơi, cực quang, tinh thể băng | Bóng ma, ma cà rồng, người sói |
| Núi Lửa Rồng Lửa | Dung nham, tàn lửa và tro bay, núi lửa phía xa | Tất cả, kèm Rồng Lửa (boss) |
| Đầm Lầy Bạch Đằng | Sông nước sương khói, thủy triều dập dềnh, cọc nhọn dưới sông, thuyền chiến đắm, đom đóm và mưa phùn | Bóng ma, bộ xương, goblin, phù thủy, nữ quỷ |
| Hang Phong Nha | Hang động nhũ đá, tinh thể phát sáng đổi màu, sông ngầm, giọt nước rơi | Dơi quỷ, goblin, xác ướp, nữ quỷ, người đá |

Màn thường xoay vòng 7 bản đồ (Làng, Nghĩa Địa, Trăng Máu, Giông Bão, Băng Giá, Bạch Đằng, Phong Nha). Màn có boss (5, 10, 15...) dùng bản đồ riêng của boss: Núi Lửa cho Rồng Lửa, Đồi Giông Bão cho Titan Đá, Nghĩa Địa cho Vua Xương.

## Quái tinh anh, phản hồi đòn đánh và cảnh báo

- **Quái tinh anh:** từ màn 2, một phần quái xuất hiện với tiền tố, to hơn, phát sáng và có vòng màu dưới chân cùng viên ngọc trên đầu (chấm vàng trên bản đồ nhỏ). Nhanh (xanh lam, chạy nhanh hơn 45%), Nổ (cam, nổ khi chết gây sát thương người đứng gần), Hồi Máu (xanh lá, hồi 6% máu mỗi giây cho quái xung quanh), Giáp Dày (xám, máu gấp rưỡi, nhận ít hơn 35% sát thương). Rơi vàng gấp 1,8 lần và cho gấp đôi kinh nghiệm. Tỉ lệ tăng dần theo màn, tối đa 30%.
- **Phản hồi đòn đánh:** quái méo nhẹ khi trúng đòn, chí mạng hiện số to hơn kèm dấu chấm than và rung màn hình. Khi chơi một mình, chí mạng và hạ quái lớn, tinh anh, boss làm hình khựng một nhịp ngắn.
- **Cảnh báo trước đòn:** quái cận chiến hiện vòng đỏ đúng tầm đánh, quái bắn xa hiện vệt đỏ theo hướng bắn, quái vồ hiện vệt đỏ theo hướng vồ.

## Sự kiện bản đồ

Trong lúc đánh, cứ 13 đến 21 giây bản đồ tung ra một sự kiện riêng (có thông báo trên màn hình):

| Bản đồ | Sự kiện |
|---|---|
| Làng Trống Đồng | Mưa vàng: vàng rơi quanh bạn |
| Nghĩa Địa Sương Mù | Mồ ma trỗi dậy: sương dày thêm và 4 quái chui ra từ mộ |
| Rừng Trăng Máu | Trăng máu thịnh: trời đỏ, quái nhanh hơn 25% trong 8 giây |
| Đồi Giông Bão | Giông sét: nhiều vòng xanh cảnh báo rồi sét đánh xuống, gây sát thương cho bạn và cho cả quái |
| Cao Nguyên Băng Giá | Băng nứt: tuyết dày thêm, gai băng trồi lên tại các vòng cảnh báo, đánh trúng cả quái |
| Núi Lửa | Mưa thiên thạch: thiên thạch rơi xuống các vòng đỏ, đập cả quái |
| Đầm Lầy Bạch Đằng | Sóng dữ: cột nước phun lên tại các vòng xanh, đánh trúng cả quái |
| Hang Phong Nha | Sập đá: đá rơi từ trần hang xuống các vòng xám, đập cả quái |

## Quái vật phương Tây (22 loại)

Mỗi bản đồ có đội quái riêng, và mỗi màn bỏ bớt một loại phụ nên hai màn cùng bản đồ vẫn khác nhau. Càng lên màn cao, bản đồ càng có thêm loại quái mới và số lượng tăng.

| Bản đồ | Quái |
|---|---|
| Làng Trống Đồng | Goblin (nhanh, yếu), Bù Nhìn Ma, Xác Sống, Bộ Xương (bắn xương), Người Sói (từ màn 4) |
| Nghĩa Địa Sương Mù | Bộ Xương, Xác Ướp (chậm, trâu), Bóng Ma (xuyên vật cản), Nữ Quỷ Gào Thét (bắn cầu tím, từ màn 3), Bù Nhìn Ma, Ma Cà Rồng (từ màn 6) |
| Rừng Trăng Máu | Dơi Quỷ (bay, đông, nhanh), Người Sói (vồ), Ma Cà Rồng (dịch chuyển ra sau lưng), Phù Thủy (bắn cầu độc xanh, từ màn 3), Goblin |
| Đồi Giông Bão | Tiểu Quỷ (vồ, nhanh), Người Đá (đập vùng), Frankenstein (từ màn 4), Bộ Xương, Phù Thủy (từ màn 5) |
| Cao Nguyên Băng Giá | Sói Băng (vồ), Người Tuyết Ma (ném cầu tuyết), Người Tuyết Khổng Lồ (đập vùng, từ màn 4), Bóng Ma, Ma Cà Rồng (từ màn 6) |
| Núi Lửa | Chó Địa Ngục, Tiểu Quỷ, Quỷ Lửa (bắn cầu lửa, từ màn 2), Người Dung Nham (từ màn 3), Người Sói, Frankenstein (từ màn 6) |

Boss cứ 5 màn một lần, xoay vòng: màn 5, 20, 35... là Rồng Lửa (phun lửa, giậm đất) ở Núi Lửa; màn 10, 25, 40... là Titan Đá Khổng Lồ (đập vùng cực lớn) ở Đồi Giông Bão; màn 15, 30, 45... là Vua Xương Lich (bắn từng loạt cầu tím, gọi bộ xương từ đất, ném vòng sét tím) ở Nghĩa Địa. Quái rơi vàng và bánh chưng (hồi máu).

## Trang bị mua bằng vàng

12 món ở 4 ô: Mũ (thêm máu), Giáp (giảm sát thương), Giày (tăng tốc chạy), Bùa (thêm vàng, sát thương, chí mạng).

## Bối cảnh

Sân đấu mang không khí làng Việt: mặt trống đồng Đông Sơn khổng lồ ở giữa sân, nhà sàn, đèn lồng, ao sen, rừng tre, ruộng lúa và núi xa.

## Điều khiển cảm ứng, bảng xếp hạng, kiểm tra cân bằng

- **Cảm ứng:** trên điện thoại hoặc máy tính bảng, khi vào trận sẽ hiện cần điều khiển bên trái (di chuyển) và các nút Đánh, Q, E, Lướt, tạm dừng bên phải. Đòn đánh tự nhắm vào quái gần nhất. Mở `?touch=1` sau địa chỉ để bật thử trên máy tính. Mã ở `src/arena3d/touch.ts`.
- **Bảng xếp hạng:** trong sảnh ghép trận có bảng top 10 theo màn rồi theo số quái. Điểm tự gửi khi kết thúc một trận chơi cùng bạn bè, máy chủ lưu ở `server/data/leaderboard.json`. Điểm do máy khách tự báo nên máy chủ chỉ kiểm tra hợp lý (số quái không vượt xa số màn, mỗi người 15 giây một lần), không chống gian lận triệt để.
- **Kiểm tra cân bằng:** `npm run balance` (hoặc `node tools/balance.mjs --players 2 --waves 40`) ước lượng thời gian dọn mỗi màn cho mọi cặp tướng, vũ khí và cấp nâng cấp, kèm thẻ nâng cấp ước tính theo cấp nhân vật, rồi đánh dấu màn quá dễ hoặc quá khó. Chỉ là mô hình đơn giản (bỏ qua né đòn, sự kiện, boss, combo) nên dùng để so sánh tương đối.

## Chơi cùng bạn bè (tối đa 4 người)

Nhấn **Chơi cùng bạn bè** ở sảnh chính. Máy chủ sảnh chạy ngay trong `npm run dev`, không cần mở thêm lệnh nào.

**Cách mời bạn vào chơi cùng:**
1. Chạy `npm run dev`. Terminal sẽ in ra địa chỉ dạng `http://192.168.x.x:5173` (dòng Network).
2. Gửi địa chỉ đó cho bạn (cùng mạng Wi-Fi hoặc LAN). Bạn mở địa chỉ trong trình duyệt.
3. Mỗi người nhập tên, để trống ô địa chỉ máy chủ, bấm **Kết nối**.
4. Một người nhập một **ID phòng** bất kỳ (ví dụ `NHA1`) rồi bấm **Vào hoặc tạo phòng**. Người kia nhập cùng ID là vào chung phòng. ID chưa có thì phòng mới được tạo và người tạo là chủ phòng.
5. Bạn bè bấm **Sẵn sàng**, chủ phòng bấm **Bắt đầu trận**.

**Sảnh ghép trận:** danh sách các phòng đang chờ (bấm Vào), chat chung cho mọi người trong sảnh, nút **Ghép trận nhanh** tự xếp bạn vào phòng đang chờ hoặc tạo phòng mới. Trong phòng có chat phòng, chọn tướng và vũ khí, nút Sao chép ID để gửi cho bạn.

**Trong trận:** mọi người đánh cùng một đợt quái. Quái trâu hơn và đông hơn theo số người. Nhấn **Enter** để chat với đồng đội. Người gục ngã được hồi sinh sau mỗi màn, cả đội gục ngã thì trận kết thúc. Vàng nhặt được tính cho người nhặt và lưu vào bản lưu riêng của từng người. Mỗi người dùng tướng, vũ khí và trang bị của chính mình.

**Chạy máy chủ độc lập** (không cần Vite):

```bash
npm run build
npm run server        # cổng 8787, đổi bằng biến môi trường PORT
```

Bạn bè mở `http://<địa-chỉ-IP-máy-bạn>:8787`. Windows có thể hỏi cho phép Node.js qua tường lửa: chọn cho phép mạng riêng.

**Chơi qua Internet:** máy chủ phải truy cập được từ ngoài. Có hai cách: dùng dịch vụ đường hầm (tunnel) trỏ vào cổng 5173 hoặc 8787 của máy bạn, hoặc đưa thư mục dự án lên một máy chủ có Node.js rồi chạy `npm run server`. Nếu trang web dùng https thì cần đặt máy chủ sau proxy hỗ trợ wss. Phần này mình chưa thử trên Internet thật, chỉ thử trong máy.

**Cách hoạt động:** máy chủ sảnh chỉ quản lý phòng, chat và chuyển tiếp dữ liệu. Chủ phòng chạy toàn bộ mô phỏng trận (quái, sát thương, vàng rơi) và gửi hình ảnh trận cho bạn bè 15 lần mỗi giây. Bạn bè tự điều khiển nhân vật của mình tại máy và gửi vị trí, hướng nhắm, thao tác về cho chủ phòng. Vì vậy chủ phòng thoát giữa trận thì trận kết thúc, còn bạn bè thoát thì trận vẫn tiếp tục.

## Lưu game

Vàng, vũ khí, trang bị, tướng đã chọn và kỷ lục lưu trong `localStorage` của trình duyệt, tự lưu khi nhặt vàng, mua đồ và khi kết thúc lượt. Dữ liệu lưu được kiểm tra trước khi dùng: mục không hợp lệ bị bỏ, bản hỏng thì tạo bản mới.

## Cấu trúc dự án

```
index.html                   Trang game
server/
  rooms.mjs                  Máy chủ sảnh và phòng (WebSocket), dùng chung cho dev và độc lập
  index.mjs                  Máy chủ độc lập: phục vụ bản build và sảnh tại /ws
  test.mjs                   Kiểm thử máy chủ sảnh
src/arena3d/
  main.ts                    Khởi tạo renderer, chuyển giữa sảnh và trận
  data.ts                    Tướng, vũ khí, trang bị, quái, thành phần các đợt
  stats.ts                   Tính chỉ số từ tướng, vũ khí, trang bị
  save.ts, shop.ts           Lưu game, mua bán
  models.ts                  Mô hình 3D dựng bằng code (người, vũ khí, quái, đạn)
  world.ts                   Sân đấu và sảnh chờ
  arena.ts                   Chiến đấu, quái, đợt, vàng, đồng bộ chủ phòng và máy khách
  arenaTypes.ts, sfx.ts      Kiểu dữ liệu, âm thanh
  net.ts, online.ts          Kết nối mạng, giao diện sảnh ghép trận và phòng chờ
  lobby.ts, ui.ts            Cảnh sảnh và giao diện DOM
  biomes.ts, worldKit.ts     Tám bản đồ (cảnh, thời tiết, quái) và công cụ dựng chung
  cards.ts, quests.ts        Thẻ nâng cấp, nhiệm vụ ngày và thành tích
  hazards.ts, settings.ts    Mối nguy chế độ vô tận, cài đặt người chơi
  ambience.ts, touch.ts      Âm nền theo bản đồ, điều khiển cảm ứng
  arena3d.css                Kiểu giao diện
tools/
  gen-model.mjs              Tạo model .glb từ ảnh bằng API image-to-3D
  balance.mjs                Kiểm tra cân bằng ước lượng
```

## Chỉnh nội dung

Phần lớn nội dung là dữ liệu trong `src/arena3d/data.ts`: thêm tướng, vũ khí, trang bị, đổi giá và chỉ số. Vũ khí mới cần thêm mô hình trong `buildWeaponModel` (`models.ts`) và nhánh xử lý trong `tryAttack` (`arena.ts`). Quái mới cần thêm vào `MONSTERS`, mô hình trong `buildMonster` và hành vi trong `updateMon`.

Toàn bộ mô hình được dựng bằng code, không cần tệp ngoài. Muốn dùng mô hình thật (glTF), thay hàm dựng tương ứng trong `models.ts`.

## Kiểm thử

Bản dựng đã được chạy thử trên trình duyệt qua các luồng: chọn tướng và vũ khí, mua bán và nâng cấp ở sảnh, vào trận, đánh bằng cả 7 vũ khí (sát thương, choáng, làm chậm, chảy máu, xuyên quái), các đợt quái, boss rồng, lướt, chiêu cuối, tạm dừng và mua đồ giữa trận, màn thua, lưu game.

`npm run test:server` chạy 28 kiểm tra cho máy chủ sảnh bằng các client giả: chat sảnh và chat phòng tách biệt, vào phòng bằng ID (không phân biệt hoa thường), ghép trận nhanh, phòng đầy 4 người, chuyển chủ phòng, chặn người ngoài phòng, chủ phòng thoát giữa trận, giới hạn spam, dữ liệu rác.

Chơi nhiều người đã được thử trong trình duyệt bằng hai khung chạy hai người chơi thật sự: kết nối, vào phòng bằng ID, chat, sẵn sàng, bắt đầu, đồng bộ quái, đạn, vùng nguy hiểm và thanh máu boss, người chơi từ xa đánh quái và nhận vàng đúng, di chuyển hai chiều, chat trong trận, ngã và hồi sinh, cả đội gục ngã, về phòng chờ chơi tiếp, bạn rời giữa trận, chủ phòng thoát giữa trận.

Trong console trình duyệt có `window.__arena` để hỗ trợ gỡ lỗi.

## Hạn chế hiện tại

- Mô hình là khối low-poly dựng bằng code, chưa có hoạt ảnh xương.
- Điều khiển cảm ứng mới thử bằng cách giả lập sự kiện chạm trên máy tính, chưa thử trên điện thoại thật.
- Chơi nhiều người: mới thử với 2 người trên cùng một máy, chưa thử 3 đến 4 người, chưa thử qua mạng thật nên độ trễ và mất gói chưa được kiểm chứng. Máy khách tự quyết vị trí của mình để không bị giật, nên không chống gian lận: chỉ nên chơi với bạn bè tin tưởng. Chủ phòng thoát giữa trận thì trận kết thúc (chưa có chuyển chủ phòng khi đang chơi).
- Độ khó và giá cả chưa được cân bằng qua nhiều lượt chơi thật. Các trận được thử bằng cách đưa quái vào trước mặt nhân vật và tự hồi máu, nên chỉ xác nhận cơ chế chạy. Các con số nằm trong `src/arena3d/data.ts` và `arena.ts`.

## Dùng model 3D (.glb) cho tướng

Mặc định các tướng được dựng bằng khối trong code. Muốn thay một tướng bằng model figure/anime:

1. Có sẵn file `.glb`: chép vào `public/models/`, rồi khai báo trong `public/models/manifest.json`, ví dụ
   `{ "hai_ba_trung": { "file": "hai_ba_trung.glb", "height": 2.1, "yaw": 0 } }`. Các id tướng: `tran_hung_dao`, `quang_trung`, `le_loi`, `hai_ba_trung`, `ba_trieu`, `ngo_quyen`, `ly_thuong_kiet`.
   `height` là chiều cao trong game, `yaw` là góc xoay (độ) nếu model quay sai hướng.
2. Chưa có file: đặt ảnh tham khảo (một nhân vật đứng thẳng, nền đơn giản, ảnh bạn có quyền dùng) vào `assets/reference/<id>.png`, đặt khóa API vào biến môi trường rồi chạy
   `node tools/gen-model.mjs <id> --provider tripo` (biến `TRIPO_API_KEY`) hoặc `--provider meshy` (biến `MESHY_API_KEY`).
   Script tải về `public/models/<id>.glb` và tự ghi vào manifest. Phần gọi API viết theo tài liệu công khai, chưa chạy thử với khóa thật.

Model được tự căn chiều cao, đặt chân xuống sàn và dùng ở sảnh lẫn trong trận (cả khi chơi nhiều người, mỗi máy tự nạp file của mình). Vì model AI thường không có xương, chuyển động chạy, đánh, nghiêng người được giả lập bằng cách nhún và nghiêng cả model; vũ khí vẫn gắn vào tay phải của bộ khung ẩn. Tướng nào chưa có model thì vẫn dùng hình khối.
