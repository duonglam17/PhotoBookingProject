-- =============================================
-- Sample Blog Posts for PDUN
-- Chạy file này trong phpMyAdmin (tab SQL)
-- =============================================

-- Xóa dữ liệu cũ trước khi insert lại
DELETE FROM Blog_Posts;

INSERT INTO Blog_Posts (title, slug, excerpt, content, feature_image, category_id, author_name, reading_time, status, created_at) VALUES
(
'Cách chụp ảnh chân dung đẹp tự nhiên, thu hút mọi ánh nhìn',
'cach-chup-anh-chan-dung-dep-tu-nhien',
'Chụp ảnh chân dung vốn không còn xa lạ bởi có thể khắc họa rõ cá tính, cảm xúc của mỗi người. Cùng PDUN khám phá những phong cách phổ biến và tips hữu ích giúp bạn tự tin hơn trước ống kính nhé.',
'<h2>Chụp ảnh chân dung ngoài phố năng động</h2><p>Lấy background đường phố tấp nập, phong cách này mang đến những bức ảnh chân dung trẻ trung, phóng khoáng, đầy năng lượng. Bạn có thể tạo dáng như đang bước sang đường, đi dạo trên vỉa hè hoặc dừng chân tại những góc phố đẹp.</p><img src="/images/blog/blog-1.jpg" alt="Chụp ảnh chân dung ngoài phố"/><em>Chụp ảnh chân dung với background đường phố năng động</em><h2>Chụp ảnh chân dung dịu dàng với hoa</h2><p>Chắc chắn đây là concept chụp ảnh chân dung cho những nàng thơ. Với những bông hoa là điểm nhấn chính, phong cách này tôn lên vẻ đẹp tinh tế, dịu dàng và mềm mại. Tone màu tươi sáng kết hợp cùng lớp makeup nhẹ nhàng tạo nên tổng thể hài hòa.</p><img src="/images/blog/blog-2.jpg" alt="Chụp ảnh chân dung dịu dàng với hoa"/><em>Toát lên vẻ đẹp trong trẻo, thuần khiết</em><h2>Bí kíp để chụp ảnh chân dung nghệ thuật</h2><h3>Hiểu rõ góc mặt</h3><p>Khi chụp ảnh chân dung nghệ thuật, việc hiểu góc mặt của chính mình sẽ giúp bạn tự tin hơn trước ống kính. Hãy thử xoay nhẹ đầu, nghiêng mặt vừa phải để tìm ra góc khiến gương mặt trông hài hòa nhất.</p><h3>Background không rối</h3><p>Khi chụp ảnh chân dung nghệ thuật, hậu cảnh đóng vai trò làm nền để tôn lên chủ thể. Một background quá nhiều chi tiết thừa sẽ làm hỏng bức ảnh. Hãy ưu tiên những mảng màu lớn như tường trơn hoặc bụi cây.</p><p>Tham khảo thêm hướng dẫn chi tiết tại: <a href="https://potonow.vn/blogs/cach-chup-anh-chan-dung-dep-tu-nhien-thu-hut-moi-anh-nhin">Potonow - Chụp ảnh chân dung</a></p><p><strong>Tác giả: Vân Anh</strong></p>',
'/images/blog/blog-1.jpg', 1, 'Vân Anh', 5, 'published', '2026-01-15 08:00:00'),
(
'18 tư thế chụp ảnh du lịch cho cặp đôi trông tự nhiên ở mọi điểm đến',
'18-tu-the-chup-anh-du-lich-cho-cap-doi',
'Một điểm đến đẹp xứng đáng có những tư thế đẹp, không gượng gạo và nụ cười tự nhiên. Trong bài viết này, bạn sẽ tìm thấy 18 tư thế chụp ảnh du lịch tự nhiên cho các cặp đôi trên bãi biển, phố phường, núi non.',
'<h2>Tư thế tự nhiên trên bãi biển</h2><p>Trên bãi biển, hãy thử nắm tay nhau đi dọc bờ sóng, nhìn về phía nhau thật tự nhiên. Ánh hoàng hôn nền trời sẽ tạo nên khung hình lãng mạn.</p><img src="/images/blog/blog-2.jpg" alt="Tư thế chụp ảnh du lịch"/><em>Hai người nắm tay dọc bờ sóng lúc hoàng hôn</em><h2>Tư thế trên phố phường</h2><p>Dạo bước trên những con phố nhộn nhịp, hai người vừa đi vừa cười nói, nhìn nhau đầy nhẹ nhàng. Những khoảnh khắc ngẫu nhiên thường là đẹp nhất.</p><h2>Tư thế giữa núi non</h2><p>Ngồi tựa vai nhau ngắm cảnh núi rừng, hoặc đứng song song nhìn xa - hai kiểu này luôn tạo cảm giác bình yên và kết nối.</p><h2>Lưu ý cho cặp đôi</h2><p>Hãy tương tác với nhau như thể không có máy ảnh. Những cái chạm tay, ánh mắt hướng về nhau là "chất xúc tác" cho bức ảnh tự nhiên nhất.</p><p>Tham khảo thêm: <a href="https://potonow.vn/blogs/18-couple-travel-photo-poses-that-look-natural-in-every-destination">18 Couple Travel Photo Poses</a></p><p><strong>Tác giả: PDUN Team</strong></p>',
'/images/blog/blog-2.jpg', 2, 'PDUN Team', 6, 'published', '2026-06-09 09:00:00'),
(
'Chụp ảnh nhóm sao cho xứng đáng "hội bạn thân nhà người ta"?',
'chup-anh-nhom-sao-cho-xung-dang',
'Có phải càng thân thì càng nhiều ảnh dìm nhưng ảnh chụp chung lại chẳng được bao nhiêu? Vậy thì đã đến lúc hẹn nhau một buổi chụp đàng hoàng để lưu lại khoảnh khắc thanh xuân tươi đẹp.',
'<h2>Chọn concept chung cho cả nhóm</h2><p>Khi chụp ảnh nhóm, việc chọn concept chung sẽ làm bộ ảnh liền mạch và ấn tượng hơn. Bạn có thể chọn đồng phục màu sắc, cùng một phong cách hoặc một không gian chung.</p><img src="/images/blog/blog-3.jpg" alt="Chụp ảnh nhóm"/><em>Khoảnh khắc thanh xuân cùng hội bạn thân</em><h2>Bố cục xuất sắc cho ảnh nhóm</h2><p>Nhóm đông người nên tạo tầng - hàng trước ngồi, hàng sau đứng để mọi người đều xuất hiện rõ ràng. Nhóm ít người có thể dàn hàng ngang hoặc tựa vào nhau thật thoải mái.</p><h2>Biểu cảm tự nhiên</h2><p>Đừng nhìn thẳng vào máy ảnh nhàm chán. Hãy cười với nhau, trêu nhau, nắm tay nhau - những khoảnh khắc tương tác thật sự mới là thứ đáng nhớ nhất.</p><p>Tham khảo thêm: <a href="https://potonow.vn/blogs/chup-anh-nhom-sao-cho-xung-dang-hoi-ban-than-nha-nguoi-ta">Hướng dẫn chụp ảnh nhóm</a></p><p><strong>Tác giả: Minh Khuê</strong></p>',
'/images/blog/blog-3.jpg', 1, 'Minh Khuê', 4, 'published', '2026-09-16 10:00:00'),
(
'15 cách tạo dáng chụp ảnh hoàng hôn để không bỏ lỡ "giờ vàng"',
'15-cach-tao-dang-chup-anh-hoang-hon',
'Tạo dáng chụp ảnh hoàng hôn thế nào để nổi bật giữa khung cảnh lãng mạn mà không bị gượng? Cùng PDUN khám phá ngay những kiểu pose vừa đơn giản, vừa "ăn ảnh" để không bỏ lỡ khung giờ vàng trong ngày nhé!',
'<h2>Đứng hướng mặt về phía nắng</h2><p>Ánh nắng hoàng hôn dịu nhẹ chiếu trực diện sẽ làm nổi bật từng đường nét trên gương mặt, là lựa chọn hàng đầu cho ảnh chân dung lúc "giờ vàng".</p><img src="/images/blog/blog-4.jpg" alt="Chụp ảnh hoàng hôn"/><em>Tận dụng khoảnh khắc giờ vàng để có khung hình đẹp</em><h2>Tận dụng bóng đổ và phản chiếu</h2><p>Bong bóng, bóng dáng của bạn trên cát hoặc mặt nước phản chiếu bầu trời cam tím sẽ tạo những thước phim ấn tượng.</p><h2>Di chuyển nhẹ nhàng</h2><p>Thay vì đứng yên, hãy bước đi, xoay váy, tung khăn quàng cổ - những chuyển động mềm mại tạo độ "chuyển động" đẹp cho khung hình.</p><h2>Chụp silhouette (bóng tối)</h2><p>Đứng ngược chiều nắng, tạo dáng hình dáng cơ thể rõ ràng, bạn sẽ có những tấm ảnh đen bóng đầy nghệ thuật.</p><p>Tham khảo thêm: <a href="https://potonow.vn/blogs/15-cach-tao-dang-chup-anh-hoang-hon-de-khong-bo-lo-gio-vang">Hướng dẫn tạo dáng hoàng hôn</a></p><p><strong>Tác giả: Hà My</strong></p>',
'/images/blog/blog-4.jpg', 1, 'Hà My', 5, 'published', '2026-06-09 14:00:00'),
(
'Nhiếp ảnh gia PDUN hé lộ bí kíp làm việc với khách nước ngoài',
'bi-kip-lam-viec-voi-khach-nuoc-ngoai',
'Với khách nước ngoài, buổi chụp thành công không chỉ dựa vào kỹ thuật mà còn ở sự tinh tế trong giao tiếp và cách làm việc. Cùng PDUN tham khảo 4 tips dưới đây nhé!',
'<h2>Giao tiếp bằng ngôn ngữ cơ thể</h2><p>Không phải ai cũng thuận lợi về ngôn ngữ. Hãy dùng cử chỉ, biểu cảm khuôn mặt và hình mẫu để hướng dẫn tạo dáng một cách thân thiện nhất.</p><img src="/images/blog/blog-5.jpg" alt="Nhiếp ảnh gia làm việc với khách nước ngoài"/><em>Nhiếp ảnh gia PDUN đồng hành cùng khách quốc tế</em><h2>Tìm hiểu phong cách ưa thích</h2><p>Hỏi khách về phong cách họ thích trước buổi chụp. Mỗi nền văn hóa có gu thẩm mỹ riêng - tôn trọng điều đó là chìa khóa.</p><h2>Kiểm tra trang phục và địa điểm trước</h2><p>Chuẩn bị kỹ càng để buổi chụp diễn ra mượt mà: địa điểm đẹp, ánh sáng hợp lý, tránh khung giờ quá đông người.</p><h2>Gửi ảnh nhanh chóng</h2><p>Khách nước ngoài thường ở lại thăm quan, hãy gửi ảnh preview ngay trong 1-2 ngày để họ có trải nghiệm tuyệt vời và giới thiệu tiếp cho bạn bè.</p><p><strong>Tác giả: Dũng Nguyễn</strong></p>',
'/images/blog/blog-5.jpg', 3, 'Dũng Nguyễn', 4, 'published', '2026-01-15 08:30:00'),
(
'Xu hướng quà Tết cho bố mẹ 2026: Tặng gì để trọn vẹn chữ hiếu?',
'xu-huong-qua-tet-cho-bo-me-2026',
'Quà Tết cho bố mẹ không chỉ đơn thuần là một món đồ vật chất, mà còn là cách mỗi người con gửi gắm lời cảm ơn và yêu thương đến đấng sinh thành.',
'<h2>Bộ ảnh gia đình - món quà ý nghĩa nhất</h2><p>Một bộ ảnh gia đình đẹp giữa dịp Tết đoàn viên không chỉ lưu giữ khoảnh khắc mà còn là món quà tinh thần trọn vẹn nhất cho bố mẹ.</p><img src="/images/blog/blog-6.jpg" alt="Chụp ảnh gia đình dịp Tết"/><em>Khoảnh khắc đoàn viên bên gia đình trong dịp Tết</em><h2>Những concept Tết phù hợp</h2><p>Áo dài truyền thống, chụp cận Tết với hoa mai - hoa đào, hay những buổi chụp ấm cúng tại nhà đều là lựa chọn tuyệt vời.</p><h2>Đặt lịch sớm để không bỏ lỡ</h2><p>Mùa Tết lượng booking nhiếp ảnh gia thường kín chỗ. Hãy đặt lịch từ sớm để có được khung giờ và địa điểm ưng ý nhất.</p><p>Tham khảo thêm: <a href="https://potonow.vn/blogs/xu-huong-qua-tet-cho-bo-me-2026-tang-gi-de-tron-ven-chu-hieu">Xu hướng quà Tết cho bố mẹ</a></p><p><strong>Tác giả: Thu Trang</strong></p>',
'/images/blog/blog-6.jpg', 5, 'Thu Trang', 4, 'published', '2026-02-11 09:30:00')
;