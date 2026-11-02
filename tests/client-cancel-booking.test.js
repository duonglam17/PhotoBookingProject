const http = require("http");
const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const bookingRoutes = require("../routes/bookingRoutes");

const JWT_SECRET = process.env.JWT_SECRET || "development-only-secret";

// Tạo token xác thực
const clientToken = jwt.sign({ userId: 7, role: "client" }, JWT_SECRET, { expiresIn: "1h" });
const otherClientToken = jwt.sign({ userId: 8, role: "client" }, JWT_SECRET, { expiresIn: "1h" });
const photographerToken = jwt.sign({ userId: 6, role: "photographer" }, JWT_SECRET, { expiresIn: "1h" });

// Khởi tạo Express Test Server
const app = express();
app.use(express.json());
app.use("/api/bookings", bookingRoutes);

let server;
let baseUrl;
const testBookingIds = [];

async function setup() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/bookings`;
      console.log(`[TEST SERVER] Running on ${baseUrl}`);
      resolve();
    });
  });
}

async function createTestBooking({ userId, status, notes }) {
  const code = `TEST-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const [res] = await db.execute(
    `INSERT INTO bookings (booking_code, user_id, package_id, booking_date, start_time, location, notes, status)
     VALUES (?, ?, 1, '2026-12-01', '09:00:00', 'Studio Test', ?, ?)`,
    [code, userId, typeof notes === "object" ? JSON.stringify(notes) : notes, status]
  );
  testBookingIds.push(res.insertId);
  return { id: res.insertId, code };
}

async function cleanup() {
  if (testBookingIds.length > 0) {
    const placeholders = testBookingIds.map(() => "?").join(",");
    await db.execute(`DELETE FROM bookings WHERE booking_id IN (${placeholders})`, testBookingIds);
    console.log(`[CLEANUP] Deleted ${testBookingIds.length} test bookings.`);
  }
  if (server) {
    server.close();
  }
}

async function runTests() {
  await setup();
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    console.log("\n================ KỊCH BẢN THỬ NGHIỆM TÍNH NĂNG HỦY ĐƠN LỊCH CHỤP ================\n");

    // 1. Tạo các đơn mẫu để test
    const initialNotes = {
      title: "Chụp ảnh kỷ niệm ngày cưới",
      description: "Gói chụp ngoại cảnh công viên",
      minBudget: 1500000,
      maxBudget: 2500000,
      addOns: ["Makeup", "Trang phục"],
      note: "Khách cần chuẩn bị trước 30p",
      referenceImage: "https://example.com/ref.jpg"
    };

    const bPending = await createTestBooking({ userId: 7, status: "pending", notes: initialNotes });
    const bConfirmed = await createTestBooking({ userId: 7, status: "confirmed", notes: initialNotes });
    const bCancelled = await createTestBooking({ userId: 7, status: "cancelled", notes: initialNotes });
    const bInProgress = await createTestBooking({ userId: 7, status: "in_progress", notes: initialNotes });
    const bOtherUser = await createTestBooking({ userId: 8, status: "pending", notes: initialNotes });

    // TEST 1: AC1 - Hủy đơn pending hợp lệ
    console.log("\n[TEST 1] AC1: Khách hàng hủy đơn ở trạng thái 'pending' kèm lý do hợp lệ");
    {
      const res = await fetch(`${baseUrl}/${bPending.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ reason: "Bận việc gia đình đột xuất không thể sắp xếp tham gia buổi chụp" })
      });
      const data = await res.json();
      assert(res.status === 200, `HTTP Status 200 (actual: ${res.status})`);
      assert(data.success === true, "Response success === true");
      assert(data.data.status === "cancelled", "Response data.status === 'cancelled'");
      assert(data.data.cancellationReason === "Bận việc gia đình đột xuất không thể sắp xếp tham gia buổi chụp", "Cancellation reason matched");
      assert(Boolean(data.data.cancelledAt), "cancelledAt timestamp is present");

      // Kiểm tra trong CSDL (AC9 - Zero migration & Bảo lưu dữ liệu)
      const [[dbRow]] = await db.execute("SELECT status, notes FROM bookings WHERE booking_id = ?", [bPending.id]);
      assert(dbRow.status === "cancelled", "Database status updated to 'cancelled'");
      const parsedNotes = JSON.parse(dbRow.notes);
      assert(parsedNotes.cancellationReason === "Bận việc gia đình đột xuất không thể sắp xếp tham gia buổi chụp", "DB notes contains cancellationReason");
      assert(parsedNotes.cancelledBy === "client", "DB notes cancelledBy === 'client'");
      assert(parsedNotes.title === initialNotes.title, "DB notes: preserved title");
      assert(parsedNotes.description === initialNotes.description, "DB notes: preserved description");
      assert(Array.isArray(parsedNotes.addOns) && parsedNotes.addOns.length === 2, "DB notes: preserved addOns array");
      assert(parsedNotes.referenceImage === initialNotes.referenceImage, "DB notes: preserved referenceImage");
    }

    // TEST 2: AC2 - Hủy đơn confirmed hợp lệ
    console.log("\n[TEST 2] AC2: Khách hàng hủy đơn ở trạng thái 'confirmed' kèm lý do hợp lệ");
    {
      const res = await fetch(`${baseUrl}/${bConfirmed.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ reason: "Thay đổi kế hoạch du lịch nên xin hủy buổi chụp" })
      });
      const data = await res.json();
      assert(res.status === 200, `HTTP Status 200 (actual: ${res.status})`);
      assert(data.data.status === "cancelled", "Response status is 'cancelled'");
      const [[dbRow]] = await db.execute("SELECT status FROM bookings WHERE booking_id = ?", [bConfirmed.id]);
      assert(dbRow.status === "cancelled", "Database status is 'cancelled'");
    }

    // TEST 3: AC3 - Chặn khi đơn đã 'cancelled'
    console.log("\n[TEST 3] AC3: Chặn hủy đơn đã ở trạng thái 'cancelled'");
    {
      const res = await fetch(`${baseUrl}/${bCancelled.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ reason: "Lý do thử nghiệm hủy lại lần 2" })
      });
      const data = await res.json();
      assert(res.status === 400, `HTTP Status 400 (actual: ${res.status})`);
      assert(data.success === false, "Response success === false");
      assert(data.message.includes("cancelled"), `Error message mentions 'cancelled' state (${data.message})`);
    }

    // TEST 4: AC3 - Chặn khi đơn ở trạng thái 'in_progress'
    console.log("\n[TEST 4] AC3: Chặn hủy đơn ở trạng thái 'in_progress'");
    {
      const res = await fetch(`${baseUrl}/${bInProgress.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ reason: "Lý do hủy đơn đang diễn ra" })
      });
      const data = await res.json();
      assert(res.status === 400, `HTTP Status 400 (actual: ${res.status})`);
      assert(data.message.includes("in_progress"), `Error message mentions 'in_progress' state (${data.message})`);
    }

    // TEST 5: AC4 - Chặn khi người dùng khác cố tình hủy đơn không phải của mình
    console.log("\n[TEST 5] AC4: Chặn người dùng khác cố tình hủy đơn không thuộc quyền sở hữu");
    {
      const res = await fetch(`${baseUrl}/${bOtherUser.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${clientToken}` }, // User 7 cố hủy đơn của User 8
        body: JSON.stringify({ reason: "Cố tình hủy trộm đơn của người khác" })
      });
      const data = await res.json();
      assert(res.status === 404, `HTTP Status 404 (actual: ${res.status})`);
      assert(data.success === false, "Response success === false");
      assert(data.message.includes("Không tìm thấy đơn đặt lịch hoặc bạn không có quyền"), "Appropriate not-found/forbidden message");
    }

    // TEST 6: AC5 - Chặn khi lý do quá ngắn (< 5 ký tự)
    console.log("\n[TEST 6] AC5: Chặn khi lý do quá ngắn (< 5 ký tự sau trim)");
    {
      const bShortTest = await createTestBooking({ userId: 7, status: "pending", notes: "Ghi chú đơn giản" });
      const res = await fetch(`${baseUrl}/${bShortTest.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ reason: "  abc  " }) // 3 ký tự sau trim
      });
      const data = await res.json();
      assert(res.status === 400, `HTTP Status 400 (actual: ${res.status})`);
      assert(data.message.includes("5 đến 500 ký tự"), `Validation message matches: ${data.message}`);
    }

    // TEST 7: AC5 - Chặn khi lý do vượt quá 500 ký tự
    console.log("\n[TEST 7] AC5: Chặn khi lý do vượt quá 500 ký tự");
    {
      const bLongTest = await createTestBooking({ userId: 7, status: "pending", notes: "" });
      const longReason = "a".repeat(501);
      const res = await fetch(`${baseUrl}/${bLongTest.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ reason: longReason })
      });
      const data = await res.json();
      assert(res.status === 400, `HTTP Status 400 (actual: ${res.status})`);
      assert(data.message.includes("5 đến 500 ký tự"), `Validation message matches: ${data.message}`);
    }

    // TEST 8: AC6 - Chặn bookingId không hợp lệ
    console.log("\n[TEST 8] AC6: Chặn khi bookingId không phải số nguyên dương hợp lệ");
    {
      const res = await fetch(`${baseUrl}/abc_xyz/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({ reason: "Lý do hợp lệ trên 5 ký tự" })
      });
      const data = await res.json();
      assert(res.status === 400, `HTTP Status 400 (actual: ${res.status})`);
      assert(data.message === "Mã đơn đặt lịch không hợp lệ.", `Message matches exactly: ${data.message}`);
    }

    // TEST 9: AC7 - Chặn khi không có token (401)
    console.log("\n[TEST 9] AC7: Chặn khi không có Authorization token");
    {
      const res = await fetch(`${baseUrl}/${bOtherUser.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Lý do hợp lệ nhưng không đăng nhập" })
      });
      assert(res.status === 401, `HTTP Status 401 Unauthorized (actual: ${res.status})`);
    }

    // TEST 10: AC8 - Chặn khi tài khoản photographer gọi API hủy đơn
    console.log("\n[TEST 10] AC8: Chặn tài khoản không phải vai trò client (photographer)");
    {
      const res = await fetch(`${baseUrl}/${bOtherUser.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${photographerToken}` },
        body: JSON.stringify({ reason: "Nhiếp ảnh gia cố tình gọi API hủy đơn" })
      });
      const data = await res.json();
      assert(res.status === 403, `HTTP Status 403 Forbidden (actual: ${res.status})`);
      assert(data.message === "Chỉ tài khoản khách hàng mới có quyền hủy đơn đặt lịch này.", `Message matches: ${data.message}`);
    }

    console.log("\n==================================================================");
    console.log(`KẾT QUẢ TỔNG HỢP: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================================\n");

    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    await cleanup();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests().catch((err) => {
  console.error("Test run exception:", err);
  process.exit(1);
});
