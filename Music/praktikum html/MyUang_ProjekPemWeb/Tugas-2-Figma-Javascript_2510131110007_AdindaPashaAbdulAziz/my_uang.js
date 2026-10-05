// aturan awal
const $ = id => document.getElementById(id);
const KEY = {
    tx: "myUangTransactions",
    user: "myUangUser",
    dark: "myUangDark",
    target: "myUangTarget"
};

let transactions = readTx();
let user = JSON.parse(localStorage.getItem(KEY.user) || "null");
let charts = {};

// fungsi dasar
function money(n) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(Number(n) || 0);
}

function readTx() {
    try {
        const data = JSON.parse(localStorage.getItem(KEY.tx) || "[]");
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveTx() {
    localStorage.setItem(KEY.tx, JSON.stringify(transactions));
}

function esc(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// profil
function nameFromEmail(email) {
    const name = (email.split("@")[0] || "Pengguna")
        .replace(/[._-]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(word => word[0].toUpperCase() + word.slice(1))
        .join(" ");

    return name || "Pengguna";
}

function initials(name) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0].toUpperCase())
        .join("") || "PU";
}

function setUser(data) {
    user = data;

    localStorage.setItem(KEY.user, JSON.stringify(data));

    $("heading").textContent = "Selamat Datang " + data.name;
    $("profile").textContent = data.initials;
    $("settingInitials").textContent = data.initials;
    $("settingEmail").textContent = data.email;
}

// Halaman Login
function login(email) {
    const name = nameFromEmail(email);

    setUser({
        email: email,
        name: name,
        initials: initials(name)
    });

    $("loginScreen").classList.add("hidden");
    $("app").classList.remove("hidden");
    showPage("dashboard");
    refresh();
}

$("loginForm").addEventListener("submit", event => {
    event.preventDefault();
    const email = $("email").value.trim();
    const password = $("password").value;

    if (!email || !password) {
        alert("Silakan isi email dan password.");
        return;
    }

    login(email);
});

$("signIn").addEventListener("click", () => {
    alert("Akun sudah terdaftar, silahkan log in dengan akun yang sudah terdaftar.");
    $("email").focus();
});

$("logout").addEventListener("click", () => {
    localStorage.removeItem(KEY.user);
    user = null;

    $("app").classList.add("hidden");
    $("loginScreen").classList.remove("hidden");
    $("password").value = "";
    $("email").focus();
});

// nav halaman
const info = {
    dashboard: [
        "Selamat Datang",
        "Ringkasan keuangan pribadimu."
    ],

    transactions: [
        "Transaksi",
        "Lihat dan kelola riwayat keuangan."
    ],

    addTransaction: [
        "Transaksi Data",
        "Masukkan detail transaksi baru."
    ],

    analysis: [
        "Analisis",
        "Pahami pola pemasukan dan pengeluaranmu."
    ],

    settings: [
        "Pengaturan",
        "Atur preferensi aplikasi My Uang."
    ],

    help: [
        "Pusat Bantuan",
        "Kami siap membantu jika kamu mengalami kendala."
    ]
};

function showPage(page) {
    if (!info[page]) {
        page = "dashboard";
    }

    document.querySelectorAll(".page").forEach(section => {
        section.classList.add("hidden");
    });

    $("page-" + page).classList.remove("hidden");
    $("heading").textContent =
        page === "dashboard" && user
            ? "Selamat Datang " + user.name
            : info[page][0];
    $("subheading").textContent = info[page][1];

    document.querySelectorAll(".nav").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === page ||
            (
                page === "addTransaction" &&
                button.dataset.page === "transactions"
            )
        );
    });

    $("sidebar").classList.remove("open");
    $("suggestions").classList.add("hidden");
    $("menuSearch").value = "";

    if (page === "dashboard") refresh();
    if (page === "transactions") renderAll();
    if (page === "analysis") renderAnalysis();
}

document.addEventListener("click", event => {
    const button = event.target.closest("[data-page]");

    if (button) {
        event.preventDefault();
        showPage(button.dataset.page);
    }
});

// kolom search (konsepnya ketika ngetik akan muncul daftar, selain nginput dari daftar maka kembali ke halaman utama)
const menus = [
    ["Halaman Utama", "dashboard", "dashboard home utama"],
    ["Transaksi", "transactions", "riwayat transaksi"],
    ["Tambah Transaksi", "addTransaction", "tambah input data"],
    ["Analisis", "analysis", "grafik diagram laporan"],
    ["Pengaturan", "settings", "setting tema target"],
    ["Pusat Bantuan", "help", "bantuan help pesan"]
];

$("menuSearch").addEventListener("input", event => {
    const query = event.target.value.toLowerCase().trim();
    const results = menus.filter(menu => {
        return query &&
            (
                menu[0].toLowerCase().includes(query) ||
                menu[2].includes(query)
            );
    });

    const box = $("suggestions");
    box.innerHTML = results.map(menu => `
        <button class="suggestion" data-page="${menu[1]}">
            ${menu[0]}
        </button>
    `).join("");
    box.classList.toggle("hidden", results.length === 0);
});

$("menuSearch").addEventListener("keydown", event => {
    if (event.key === "Enter") {
        event.preventDefault();
        const button = $("suggestions").querySelector("[data-page]");
        showPage(button ? button.dataset.page : "dashboard");
    }
});

document.addEventListener("click", event => {
    if (!event.target.closest(".search")) {
        $("suggestions").classList.add("hidden");
    }
});

// Responsive
$("mobileMenu").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
});

// Mode terang dan gelap
function theme(dark) {
    document.body.classList.toggle("dark", dark);
    $("theme").textContent = dark ? "☀" : "☾";
    $("darkSetting").checked = dark;

    localStorage.setItem(KEY.dark, String(dark));
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });

    charts = {};
    if (!$("page-dashboard").classList.contains("hidden")) {
        drawMain();
    }

    if (!$("page-analysis").classList.contains("hidden")) {
        renderAnalysis();
    }
}

$("theme").addEventListener("click", () => {
    theme(!document.body.classList.contains("dark"));
});
$("darkSetting").addEventListener("change", event => {
    theme(event.target.checked);
});
$("profile").addEventListener("click", () => {
    showPage("settings");
});

// Perhitungan keuangan
function totals() {
    let income = 0;
    let expense = 0;

    transactions.forEach(transaction => {
        if (transaction.type === "income") {
            income += Number(transaction.amount);
        } else {
            expense += Number(transaction.amount);
        }
    });

    return {
        income,
        expense,
        balance: income - expense
    };
}

// Tampilan transaksi
function rows(list, actions = false) {
    if (!list.length) {
        return `
            <tr>
                <td class="empty" colspan="${actions ? 6 : 5}">
                    Belum ada transaksi. Klik "Tambah Transaksi".
                </td>
            </tr>
        `;
    }

    return list.map(transaction => `
        <tr>
            <td>${esc(transaction.name)}</td>
            <td>${esc(transaction.dateLabel)}</td>
            <td>${esc(transaction.category)}</td>

            <td>
                <span class="type ${transaction.type}">
                    ${transaction.type === "income" ? "Income" : "Expense"}
                </span>
            </td>

            <td class="${
                transaction.type === "income"
                    ? "amount-income"
                    : "amount-expense"
            }">
                ${transaction.type === "income" ? "+" : "-"}
                ${money(transaction.amount)}
            </td>

            ${actions ? `
                <td>
                    <button class="delete" data-delete="${esc(transaction.id)}">
                        Hapus
                    </button>
                </td>
            ` : ""}
        </tr>
    `).join("");
}

function renderAll() {
    $("allRows").innerHTML = rows(
        [...transactions].reverse(),
        true
    );
}

function renderRecent() {
    $("recentRows").innerHTML = rows(
        [...transactions].slice(-5).reverse()
    );
}

// update dashboard jika ada input terbaru
function refresh() {
    const result = totals();
    const target = Math.max(
        0,
        Number(localStorage.getItem(KEY.target) || 2000000)
    );

    const ratio = target
        ? Math.max(0, Math.min(100, result.balance / target * 100))
        : 0;

    $("income").textContent = money(result.income);
    $("expense").textContent = money(result.expense);
    $("targetDisplay").textContent = money(target);
    $("savings").textContent = money(result.balance);
    $("balance").textContent = money(result.balance);
    $("progress").style.width = ratio + "%";
    $("progressLabel").textContent =
        Math.round(ratio) + "% dari target";

    renderRecent();
    renderAll();
    renderCategories();
    drawMain();
}

// pengaturan grafik
function baseOptions() {
    const dark = document.body.classList.contains("dark");
    const color = dark ? "#c4c5cd" : "#777982";
    const grid = dark ? "#3a3c45" : "#ececf0";

    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color,
                    boxWidth: 10,
                    font: { size: 10 }
                }
            }
        },

        scales: {
            x: {
                ticks: {
                    color,
                    font: { size: 9 }
                },
                grid: { color: grid }
            },

            y: {
                beginAtZero: true,
                ticks: {
                    color,
                    font: { size: 9 },

                    callback: value =>
                        new Intl.NumberFormat("id-ID", {
                            notation: "compact"
                        }).format(value)
                },
                grid: { color: grid }
            }
        }
    };
}

function makeChart(id, type, data, options) {
    const canvas = $(id);

    if (!canvas) return null;

    if (charts[id]) {
        charts[id].destroy();
    }

    charts[id] = new Chart(canvas, {
        type,
        data,
        options
    });
    return charts[id];
}

// grafik aset
function drawMain() {
    const period = $("period").value;
    const labels = period === "week"
        ? ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
        : ["M1", "M2", "M3", "M4"];
    const incomeData = Array(labels.length).fill(0);
    const expenseData = Array(labels.length).fill(0);
    const now = new Date();

    transactions
        .filter(transaction => {
            const date = new Date(transaction.dateISO + "T12:00:00");
            return date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear();
        })
        .forEach(transaction => {
            const date = new Date(transaction.dateISO + "T12:00:00");
            const index = period === "week"
                ? Math.max(0, Math.min(6, (date.getDay() + 6) % 7))
                : Math.max(0, Math.min(3, Math.floor((date.getDate() - 1) / 8)));
            const data = transaction.type === "income"
                ? incomeData
                : expenseData;

            data[index] += Number(transaction.amount);
        });

    makeChart(
        "assetsChart",
        "line",
        {
            labels,
            datasets: [
                {
                    label: "Income",
                    data: incomeData,
                    borderColor: "#08c2df",
                    backgroundColor: "rgba(8,194,223,.1)",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3
                },

                {
                    label: "Expense",
                    data: expenseData,
                    borderColor: "#ff4b55",
                    backgroundColor: "rgba(255,75,85,.07)",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 3
                }
            ]
        },
        {
            ...baseOptions(),
            plugins: {
                legend: { display: false }
            }
        }
    );

    const categories = ["Makanan", "Belanja", "Gaji"].map(category => {
        return transactions
            .filter(transaction =>
                transaction.category === category &&
                transaction.type === "expense"
            )
            .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    });

    makeChart(
        "categoryChart",
        "doughnut",
        {
            labels: ["Makanan", "Belanja", "Gaji"],

            datasets: [{
                data: categories.some(Boolean)
                    ? categories
                    : [1, 1, 1],

                backgroundColor: [
                    "#08c2df",
                    "#6053f4",
                    "#36c765"
                ],

                borderWidth: 0
            }]
        },
        {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "65%",

            plugins: {
                legend: {
                    position: "bottom",

                    labels: {
                        color: document.body.classList.contains("dark")
                            ? "#c4c5cd"
                            : "#777982",

                        boxWidth: 9,
                        font: { size: 9 }
                    }
                }
            }
        }
    );
}

$("period").addEventListener("change", drawMain);

// ringkasan kategori
function renderCategories() {
    $("categorySummary").innerHTML = [
        "Makanan",
        "Belanja",
        "Gaji"
    ].map(category => {
        const amount = transactions
            .filter(transaction =>
                transaction.category === category &&
                transaction.type === "expense"
            )
            .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

        return `
            <div>
                <span>${category}</span>
                <b>${money(amount)}</b>
            </div>
        `;
    }).join("");
}

// tambah transaksi
$("txDate").value = new Date().toISOString().slice(0, 10);
$("transactionForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("txName").value.trim();
    const amount = Number($("txAmount").value);
    const type = $("txType").value;
    const category = $("txCategory").value;
    const dateISO = $("txDate").value;

    if (!name) {
        alert("Silakan masukkan nama transaksi.");
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Jumlah transaksi harus lebih besar dari 0.");
        return;
    }

    if (!dateISO) {
        alert("Silakan pilih tanggal transaksi.");
        return;
    }

    const date = new Date(dateISO + "T12:00:00");
    transactions.push({
        id: Date.now() + "-" + Math.random(),

        name,
        amount,
        type,
        category,
        dateISO,

        dateLabel: date.toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }),

        createdAt: Date.now()
    });

    saveTx();
    event.target.reset();

    $("txDate").value = new Date().toISOString().slice(0, 10);
    refresh();
    alert("Transaksi berhasil disimpan!");
    showPage("transactions");
});

// hapus transaksi
$("allRows").addEventListener("click", event => {
    const button = event.target.closest("[data-delete]");

    if (!button) return;

    const id = button.dataset.delete;
    const transaction = transactions.find(
        item => String(item.id) === id
    );

    if (!transaction) return;

    if (confirm(`Hapus transaksi "${transaction.name}"?`)) {
        transactions = transactions.filter(
            item => String(item.id) !== id
        );

        saveTx();
        refresh();
        renderAnalysis();
        alert("Transaksi berhasil dihapus.");
    }
});

// Halaman Analisis
function renderAnalysis() {
    const result = totals();
    const count = transactions.length;
    $("analysisCount").textContent = count;

    const totalAmount = transactions.reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0
    );

    $("analysisAverage").textContent = money(
        count ? totalAmount / count : 0
    );

    $("analysisRatio").textContent = result.income
        ? Math.round(result.balance / result.income * 100) + "%"
        : "0%";

    const options = baseOptions();

    // grafik arus keuangan
    makeChart(
        "flowChart",
        "bar",
        {
            labels: ["Pemasukan", "Pengeluaran"],

            datasets: [{
                data: [result.income, result.expense],
                backgroundColor: ["#08c2df", "#ff4b55"],
                borderRadius: 7
            }]
        },
        {
            ...options,
            plugins: {
                legend: { display: false }
            }
        }
    );

    // grafik atau diagram pemasukan dan pengeluaran
    makeChart(
        "typeChart",
        "doughnut",
        {
            labels: ["Pemasukan", "Pengeluaran"],

            datasets: [{
                data: result.income || result.expense
                    ? [result.income, result.expense]
                    : [1, 1],

                backgroundColor: ["#08c2df", "#ff4b55"],
                borderWidth: 0
            }]
        },
        {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: document.body.classList.contains("dark")
                            ? "#c4c5cd"
                            : "#777982"
                    }
                }
            }
        }
    );

    // grafik kategori
    const categories = ["Makanan", "Belanja", "Gaji"].map(category => {
        return transactions
            .filter(transaction =>
                transaction.category === category &&
                transaction.type === "expense"
            )
            .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    });

    makeChart(
        "expenseChart",
        "pie",
        {
            labels: ["Makanan", "Belanja", "Gaji"],

            datasets: [{
                data: categories.some(Boolean)
                    ? categories
                    : [1, 1, 1],

                backgroundColor: [
                    "#08c2df",
                    "#6053f4",
                    "#36c765"
                ],

                borderWidth: 0
            }]
        },
        {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: document.body.classList.contains("dark")
                            ? "#c4c5cd"
                            : "#777982"
                    }
                }
            }
        }
    );

    // grafik jumlah transaksi
    makeChart(
        "countChart",
        "bar",
        {
            labels: ["Pemasukan", "Pengeluaran"],
            datasets: [{
                data: [
                    transactions.filter(t => t.type === "income").length,
                    transactions.filter(t => t.type === "expense").length
                ],

                backgroundColor: ["#36c765", "#ff4b55"],
                borderRadius: 7
            }]
        },
        {
            ...options,
            plugins: {
                legend: { display: false }
            }
        }
    );
}

// goals/target uang yang ingin kita tabung
$("saveTarget").addEventListener("click", () => {
    const target = Math.max(
        0,
        Number($("targetInput").value) || 0
    );
    localStorage.setItem(KEY.target, String(target));
    refresh();
    alert("Target tabungan berhasil disimpan.");
});

// hapus semua data
$("clearData").addEventListener("click", () => {
    if (confirm("Yakin ingin menghapus semua data transaksi?")) {
        transactions = [];
        saveTx();
        refresh();
        renderAnalysis();
        alert("Seluruh data transaksi telah dihapus.");
    }
});

// pusat bantuan
$("helpForm").addEventListener("submit", event => {
    event.preventDefault();
    const message = $("helpMessage").value.trim();
    const topic = $("helpTopic").value;

    if (!message) {
        alert("Silakan tulis pesan terlebih dahulu.");
        return;
    }

    event.target.reset();
    alert(
        `Terima kasih telah menyampaikan kendala tentang "${topic}". ` +
        "Pesan Anda sudah diterima oleh kami."
    );
});

// bagian ini buat nyimpan data, jadi misal sudah login dan melakukan transaksi dll, maka datanya kesimpan selamanya
$("targetInput").value =
    localStorage.getItem(KEY.target) || "2000000";
theme(localStorage.getItem(KEY.dark) === "true");

if (user && user.email) {
    setUser(user);
    $("loginScreen").classList.add("hidden");
    $("app").classList.remove("hidden");
    showPage("dashboard");
} else {
    $("app").classList.add("hidden");
    $("loginScreen").classList.remove("hidden");
}