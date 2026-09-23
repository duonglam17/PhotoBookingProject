from flask import Flask, render_template_string, request

app = Flask(__name__)

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Thống Kê Sinh Viên Nam/Nữ</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f6f9; }
        .container { max-width: 600px; margin: auto; background: white; padding: 25px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        h2 { text-align: center; color: #333; }
        .form-group { margin-bottom: 15px; }
        label { font-weight: bold; display: block; margin-bottom: 5px; }
        input[type="number"] { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
        button { width: 100%; padding: 10px; background-color: #007bff; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
        button:hover { background-color: #0056b3; }
        .chart-container { margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>THỐNG KÊ SINH VIÊN LỚP HỌC</h2>
        <form method="POST">
            <div class="form-group">
                <label for="nam">Số sinh viên Nam:</label>
                <input type="number" id="nam" name="nam" min="0" value="{{ nam }}" required>
            </div>
            <div class="form-group">
                <label for="nu">Số sinh viên Nữ:</label>
                <input type="number" id="nu" name="nu" min="0" value="{{ nu }}" required>
            </div>
            <button type="submit">Hiển Thị Biểu Đồ</button>
        </form>

        {% if submitted %}
        <div class="chart-container">
            <canvas id="genderChart"></canvas>
        </div>
        <script>
            const ctx = document.getElementById('genderChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Nam', 'Nữ'],
                    datasets: [{
                        label: 'Số lượng sinh viên',
                        data: [{{ nam }}, {{ nu }}],
                        backgroundColor: ['rgba(54, 162, 235, 0.7)', 'rgba(255, 99, 132, 0.7)'],
                        borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true, precision: 0 }
                    }
                }
            });
        </script>
        {% endif %}
    </div>
</body>
</html>
"""

@app.route('/', methods=['GET', 'POST'])
def index():
    nam = 0
    nu = 0
    submitted = False
    if request.method == 'POST':
        nam = int(request.form.get('nam', 0))
        nu = int(request.form.get('nu', 0))
        submitted = True
    return render_template_string(HTML_TEMPLATE, nam=nam, nu=nu, submitted=submitted)

if __name__ == '__main__':
    # Chạy trên tất cả IP (0.0.0.0) tại cổng 5175
    app.run(host='0.0.0.0', port=5175, debug=True)
