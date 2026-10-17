/**
 * Kiểm thử máy chủ sảnh và phòng bằng các client WebSocket giả.
 * Chạy: npm run test:server
 */
import { createServer } from 'node:http';
import { WebSocket } from 'ws';
import { attachGameServer } from './rooms.mjs';

let failed = 0;
const ok = (cond, msg) => {
  if (cond) console.log('OK   ' + msg);
  else {
    failed++;
    console.error('LOI  ' + msg);
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = createServer();
const game = attachGameServer(server, { boardFile: null });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `ws://127.0.0.1:${server.address().port}/ws`;

function client(name) {
  const ws = new WebSocket(url);
  const c = { ws, name, msgs: [], id: null };
  ws.on('message', (d) => {
    const m = JSON.parse(String(d));
    c.msgs.push(m);
    if (m.t === 'welcome') c.id = m.id;
  });
  c.send = (o) => ws.send(JSON.stringify(o));
  c.last = (t) => [...c.msgs].reverse().find((m) => m.t === t);
  c.all = (t) => c.msgs.filter((m) => m.t === t);
  c.ready = new Promise((r) => ws.on('open', () => r(c)));
  return c;
}
const loadout = { general: 'tran_hung_dao', weapon: 'dep_lao', weapons: { dep_lao: 0 }, equipped: { head: null, body: null, feet: null, charm: null } };

const A = client('An');
const B = client('Bình');
const C = client('Chi');
await Promise.all([A.ready, B.ready, C.ready]);
A.send({ t: 'hello', name: 'An', loadout });
B.send({ t: 'hello', name: 'Bình', loadout });
C.send({ t: 'hello', name: 'Chi', loadout });
await sleep(150);
ok(A.id && B.id && C.id && new Set([A.id, B.id, C.id]).size === 3, 'mỗi client có ID riêng');

// Chat sảnh
A.send({ t: 'chat', text: 'chào cả sảnh' });
await sleep(100);
ok(B.last('chat')?.text === 'chào cả sảnh' && B.last('chat').scope === 'lobby', 'chat sảnh chung tới người khác');
ok(A.last('chat')?.from === 'An', 'người gửi cũng thấy tin của mình');

// Vào phòng bằng ID (tạo nếu chưa có), không phân biệt hoa thường
A.send({ t: 'join', id: 'abc' });
await sleep(100);
ok(A.last('joined')?.created === true && A.last('joined').room.id === 'ABC', 'vào ID chưa có sẽ tạo phòng mới, ID viết hoa');
ok(A.last('joined').room.hostId === A.id, 'người tạo phòng là chủ phòng');
await sleep(100);
ok(B.last('rooms')?.rooms.some((r) => r.id === 'ABC' && r.count === 1), 'sảnh thấy phòng mới trong danh sách');

B.send({ t: 'join', id: 'Abc' });
await sleep(100);
ok(B.last('joined')?.created === false && B.last('joined').room.players.length === 2, 'bạn nhập cùng ID thì vào phòng đó');
ok(A.last('room')?.room.players.length === 2, 'chủ phòng được báo có người mới');

// Chat phòng không lọt ra sảnh
const cBefore = C.all('chat').length;
B.send({ t: 'chat', text: 'chat trong phòng' });
await sleep(100);
ok(A.last('chat')?.scope === 'room' && A.last('chat').text === 'chat trong phòng', 'chat phòng tới thành viên');
ok(C.all('chat').length === cBefore, 'chat phòng không lọt ra sảnh');

// Bắt đầu cần mọi người sẵn sàng; chỉ chủ phòng được bắt đầu
B.send({ t: 'start' });
A.send({ t: 'start' });
await sleep(100);
ok(A.last('error')?.msg.includes('chưa sẵn sàng'), 'chủ phòng không bắt đầu được khi còn người chưa sẵn sàng');
ok(!B.last('start'), 'người không phải chủ phòng không bắt đầu được');
B.send({ t: 'ready', v: true });
await sleep(60);
A.send({ t: 'start' });
await sleep(100);
ok(A.last('start') && B.last('start')?.players.length === 2, 'tất cả nhận lệnh bắt đầu kèm danh sách người chơi');

// Phòng đang chơi không cho vào, không hiện trong danh sách
C.send({ t: 'join', id: 'ABC' });
await sleep(100);
ok(C.last('error')?.msg.includes('đang trong trận'), 'phòng đang chơi từ chối người vào thêm');

// Chuyển tiếp dữ liệu trận
B.send({ t: 'relay', to: 'host', d: { k: 'in', x: 1 } });
A.send({ t: 'relay', to: 'all', d: { k: 'snap', n: 7 } });
C.send({ t: 'relay', to: 'host', d: { k: 'hack' } });
await sleep(100);
ok(A.last('relay')?.d.k === 'in' && A.last('relay').from === B.id, 'thành viên gửi tới chủ phòng, kèm ID người gửi');
ok(B.last('relay')?.d.k === 'snap', 'chủ phòng gửi tới mọi thành viên');
ok(!A.all('relay').some((m) => m.d.k === 'hack'), 'người ngoài phòng không chuyển tiếp được dữ liệu');

// Kết thúc trận trở về phòng chờ
A.send({ t: 'end' });
await sleep(100);
ok(B.last('ended') && B.last('room').room.state === 'waiting', 'kết thúc trận đưa phòng về trạng thái chờ');
ok(B.last('room').room.players.every((p) => !p.ready), 'trạng thái sẵn sàng được đặt lại');

// Ghép trận nhanh
C.send({ t: 'quick' });
await sleep(100);
const quickRoom = C.last('joined').room.id;
ok(C.last('joined').created && quickRoom.length === 4, 'ghép nhanh khi chưa có phòng sẽ tạo phòng mới');
const D = client('Dũng');
await D.ready;
D.send({ t: 'hello', name: 'Dũng', loadout });
await sleep(100);
D.send({ t: 'quick' });
await sleep(100);
ok(D.last('joined').room.id === quickRoom && D.last('joined').created === false, 'ghép nhanh lần hai vào đúng phòng đang chờ');

// Rời phòng: chủ phòng chuyển giao
C.send({ t: 'leave' });
await sleep(100);
ok(D.last('room').room.hostId === D.id, 'chủ phòng rời thì người còn lại làm chủ phòng');

// Đủ 4 người thì từ chối
const E = client('E'), F = client('F'), G = client('G');
await Promise.all([E.ready, F.ready, G.ready]);
for (const x of [E, F, G]) x.send({ t: 'hello', name: x.name, loadout });
await sleep(100);
for (const x of [E, F, G]) {
  x.send({ t: 'join', id: 'FULL' });
  await sleep(60);
}
const H = client('H');
await H.ready;
H.send({ t: 'hello', name: 'H', loadout });
await sleep(80);
H.send({ t: 'join', id: 'full' });
await sleep(80);
ok(H.last('joined')?.room.players.length === 4, 'phòng nhận đủ 4 người');
const I = client('I');
await I.ready;
I.send({ t: 'hello', name: 'I', loadout });
await sleep(80);
I.send({ t: 'join', id: 'FULL' });
await sleep(100);
ok(I.last('error')?.msg.includes('đủ'), 'người thứ 5 bị từ chối');

// Chủ phòng thoát giữa trận thì phòng đóng
E.send({ t: 'start' });
for (const x of [F, G, H]) x.send({ t: 'ready', v: true });
await sleep(80);
E.send({ t: 'start' });
await sleep(100);
E.ws.close();
await sleep(150);
ok(F.last('closed') && G.last('closed') && H.last('closed'), 'chủ phòng thoát giữa trận: các thành viên được báo phòng đóng');

// ID không hợp lệ và dữ liệu rác
A.send({ t: 'join', id: '!' });
await sleep(80);
ok(A.last('error')?.msg.includes('ID phòng'), 'ID phòng không hợp lệ bị từ chối');
A.ws.send('không phải json');
const chatBefore = B.all('chat').length;
for (let i = 0; i < 300; i++) A.send({ t: 'chat', text: 'spam ' + i });
await sleep(300);
const gotSpam = B.all('chat').length - chatBefore;
ok(gotSpam > 0 && gotSpam <= 32, `gửi dồn 300 tin chỉ ${gotSpam} tin lọt qua (giới hạn 30 mỗi giây)`);
await sleep(1000);
A.send({ t: 'chat', text: 'x'.repeat(1000) });
await sleep(100);
ok(A.ws.readyState === 1, 'dữ liệu rác không làm sập kết nối');

// Bảng xếp hạng
ok(Array.isArray(A.last('board')?.top) && A.last('board').top.length === 0, 'vừa kết nối nhận được bảng xếp hạng (đang trống)');
await sleep(1100);
B.send({ t: 'score', wave: 12, kills: 340, players: 2, general: 'le_loi' });
await sleep(120);
ok(A.last('board')?.top[0]?.name === 'Bình' && A.last('board').top[0].wave === 12, 'điểm hợp lệ vào bảng và được phát cho mọi người');
await sleep(120);
B.send({ t: 'score', wave: 30, kills: 900, players: 1, general: 'le_loi' });
await sleep(120);
ok(A.last('board').top.length === 1, 'gửi điểm liên tiếp trong 15 giây bị bỏ qua');
C.send({ t: 'score', wave: 5, kills: 99999, players: 1, general: 'x' });
C.send({ t: 'score', wave: -3, kills: 10, players: 1, general: 'x' });
C.send({ t: 'score', wave: 8, kills: 100, players: 9, general: 'x' });
await sleep(150);
ok(A.last('board').top.length === 1, 'điểm vô lý (quá nhiều quái, màn âm, quá 4 người) bị từ chối');
C.send({ t: 'score', wave: 15, kills: 410, players: 3, general: 'phu_dong' });
await sleep(120);
const top = A.last('board').top;
ok(top.length === 2 && top[0].name === 'Chi' && top[1].name === 'Bình', 'bảng sắp xếp theo màn rồi theo số quái');
A.send({ t: 'board' });
await sleep(80);
ok(A.last('board').top.length === 2, 'yêu cầu bảng xếp hạng trả về danh sách hiện tại');

// ID bạn bè và lời mời
const J = client('Jun');
const K = client('Kim');
await Promise.all([J.ready, K.ready]);
J.send({ t: 'hello', name: 'Jun', loadout });
K.send({ t: 'hello', name: 'Kim', loadout, code: 'hv-zz99' });
await sleep(150);
const jc = J.last('welcome')?.code;
ok(/^HV-[A-Z0-9]{4,6}$/.test(jc ?? ''), 'người chơi mới được cấp ID dạng HV-XXXX');
ok(K.last('welcome')?.code === 'HV-ZZ99', 'ID cũ gửi lên được giữ nguyên (viết hoa)');
const K2 = client('Kim2');
await K2.ready;
K2.send({ t: 'hello', name: 'Kim2', loadout, code: 'HV-ZZ99' });
await sleep(120);
ok(K2.last('welcome')?.code !== 'HV-ZZ99' && /^HV-/.test(K2.last('welcome')?.code ?? ''), 'ID đang có người dùng thì cấp ID mới, không trùng');
K2.ws.close();
J.send({ t: 'invite', code: 'HV-NONE' });
await sleep(100);
ok(J.last('error')?.msg.includes('HV-NONE'), 'mời ID không tồn tại báo lỗi');
J.send({ t: 'invite', code: jc });
await sleep(100);
ok(J.last('error')?.msg.includes('chính bạn'), 'không thể tự mời chính mình');
J.send({ t: 'invite', code: 'hv-zz99' });
await sleep(150);
ok(J.last('invite_sent')?.name === 'Kim', 'gửi lời mời thành công, người mời được báo');
ok(K.last('invited')?.from === 'Jun' && K.last('invited').fromCode === jc && K.last('invited').room === J.last('joined')?.room.id, 'người được mời nhận thông tin phòng và người mời');
ok(J.last('joined')?.created === true, 'chưa có phòng thì tự tạo phòng khi mời');
K.send({ t: 'join', id: K.last('invited').room });
await sleep(120);
ok(K.last('joined')?.room.players.length === 2 && J.last('room')?.room.players.length === 2, 'chấp nhận lời mời thì vào cùng phòng');
J.send({ t: 'invite', code: 'HV-ZZ99' });
await sleep(100);
ok(J.last('error')?.msg.includes('đã ở trong phòng'), 'mời người đã ở trong phòng bị từ chối');

// Reconnect với secret giữ nguyên ID dù socket cũ chưa kịp đóng
const kimSecret = K.last('welcome')?.secret;
ok(kimSecret && kimSecret.length >= 16, 'máy chủ cấp secret token trong welcome');
const K_reconnect = client('Kim_Re');
await K_reconnect.ready;
K_reconnect.send({ t: 'hello', name: 'Kim', loadout, code: 'HV-ZZ99', secret: kimSecret });
await sleep(150);
ok(K_reconnect.last('welcome')?.code === 'HV-ZZ99', 'reconnect với đúng secret giữ lại ID cố định dù kết nối cũ chưa đóng');
K_reconnect.ws.close();

// Chiếm đoạt mã khi người đó offline bị từ chối
K.ws.close();
await sleep(100);
const Mallory = client('Mallory');
await Mallory.ready;
Mallory.send({ t: 'hello', name: 'Mallory', loadout, code: 'HV-ZZ99' }); // không có secret của Kim
await sleep(150);
ok(Mallory.last('welcome')?.code !== 'HV-ZZ99', 'không thể chiếm ID của người khác khi họ offline nếu thiếu secret');
Mallory.ws.close();

// Kiểm tra trạng thái trận của người mời trước khi tra cứu mục tiêu
// J bắt đầu trận một mình trong phòng của J
J.send({ t: 'start' });
await sleep(100);
J.send({ t: 'invite', code: 'HV-NONE' });
await sleep(100);
ok(J.last('error')?.msg.includes('Bạn đang trong trận'), 'người mời đang trong trận bị từ chối trước khi tra cứu mục tiêu');

// Giới hạn tần suất mời (rate limit)
const Spammer = client('Spammer');
await Spammer.ready;
Spammer.send({ t: 'hello', name: 'Spammer', loadout });
await sleep(100);
// Gửi liên tục 6 lời mời để tiêu hết 3 token burst
for (let i = 0; i < 6; i++) Spammer.send({ t: 'invite', code: 'HV-NONE' });
await sleep(150);
ok(Spammer.all('error').some((e) => e.msg.includes('quá nhanh')), 'gửi lời mời liên tục bị chặn bởi rate limit');
Spammer.ws.close();

for (const x of [J, K]) x.ws.close();

for (const x of [A, B, C, D, E, F, G, H, I]) x.ws.close();
await sleep(100);
game.close();
server.close();
console.log(failed ? `\n${failed} kiểm thử lỗi.` : '\nMáy chủ sảnh và phòng hoạt động đúng.');
process.exit(failed ? 1 : 0);
