
let transactions = JSON.parse(localStorage.getItem("spendwise_transactions")) || [];

let budget = Number(localStorage.getItem("spendwise_budget")) || 10000;

let expenseChart = null;
let analyticsChart = null;

const money = amount => "₹" + Number(amount).toLocaleString("en-IN", {
    maximumFractionDigits: 2
});

function saveData() {
    localStorage.setItem("spendwise_transactions", JSON.stringify(transactions));
    localStorage.setItem("spendwise_budget", budget);
}

function getTotals() {
    const income = transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

    return { income, expense, balance: income - expense };
}

function monthlyExpenses() {
    const now = new Date();

    return transactions.filter(t => {
        const d = new Date(t.date + "T00:00:00");

        return t.type === "expense" &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear();
    });
}

function render() {
    const totals = getTotals();
    const monthly = monthlyExpenses();

    const spent = monthly.reduce((sum, t) => sum + t.amount, 0);

    document.getElementById("balance").textContent = money(totals.balance);
    document.getElementById("income").textContent = money(totals.income);
    document.getElementById("expense").textContent = money(totals.expense);
    document.getElementById("budgetAmount").textContent = money(budget);

    document.getElementById("budgetUsed").textContent =
        money(spent) + " / " + money(budget);

    const percentage = budget > 0
        ? Math.min((spent / budget) * 100, 100)
        : 0;

    document.getElementById("budgetProgress").style.width = percentage + "%";

    document.getElementById("budgetMessage").textContent =
        spent > budget ? "You have exceeded your budget!" :
        spent === budget ? "You have used your entire budget." :
        "You have " + money(budget - spent) + " remaining.";

    document.getElementById("budgetPageAmount").textContent = money(budget);
    document.getElementById("budgetPageUsed").textContent =
        "Spent: " + money(spent);

    document.getElementById("budgetPageProgress").style.width =
        percentage + "%";

    renderTransactions();
    renderCharts();
}

function renderTransactions() {
    const recent = document.getElementById("recentTransactions");
    const all = document.getElementById("allTransactions");

    const sorted = [...transactions].sort(
        (a, b) => b.date.localeCompare(a.date) || b.id - a.id
    );

    recent.innerHTML = sorted.slice(0, 5).map(createTransaction).join("")
        || "<p>No transactions yet. Add your first transaction!</p>";

    const query = document.getElementById("search").value.toLowerCase();
    const filter = document.getElementById("filter").value;

    const filtered = sorted.filter(t => {
        return t.title.toLowerCase().includes(query) &&
            (filter === "all" || t.type === filter);
    });

    all.innerHTML = filtered.map(createTransaction).join("")
        || "<p>No matching transactions found.</p>";
}

function createTransaction(t) {
    return `
        <div class="transaction">
            <div>
                <strong>${escapeHTML(t.title)}</strong>
                <small>${escapeHTML(t.category)} · ${escapeHTML(t.date)}</small>
            </div>
            <div>
                <strong class="${t.type === 'income' ? 'income-text' : 'expense-text'}">
                    ${t.type === "income" ? "+" : "-"}${money(t.amount)}
                </strong>
                <button class="delete-btn" onclick="deleteTransaction(${t.id})">
                    Delete
                </button>
            </div>
        </div>
    `;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function openModal() {
    document.getElementById("modal").style.display = "flex";
    document.getElementById("date").value =
        new Date().toISOString().slice(0, 10);
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

document.getElementById("transactionForm").addEventListener("submit", e => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const amount = Number(document.getElementById("amount").value);

    if (!title || !Number.isFinite(amount) || amount <= 0) {
        alert("Please enter a valid title and amount.");
        return;
    }

    transactions.push({
        id: Date.now(),
        title,
        amount,
        type: document.getElementById("type").value,
        category: document.getElementById("category").value,
        date: document.getElementById("date").value
    });

    saveData();
    render();

    e.target.reset();
    closeModal();
});

function deleteTransaction(id) {
    if (!confirm("Delete this transaction?")) return;

    transactions = transactions.filter(t => t.id !== id);
    saveData();
    render();
}

function setBudget() {
    const value = prompt("Enter your monthly budget (₹):", budget);

    if (value === null) return;

    const newBudget = Number(value);

    if (!Number.isFinite(newBudget) || newBudget <= 0) {
        alert("Please enter a valid budget.");
        return;
    }

    budget = newBudget;
    saveData();
    render();
}

function renderCharts() {
    const monthly = monthlyExpenses();

    const categories = {};

    monthly.forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categories);
    const values = Object.values(categories);

    if (expenseChart) expenseChart.destroy();
    if (analyticsChart) analyticsChart.destroy();

    expenseChart = new Chart(
        document.getElementById("expenseChart"), {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        "#2563eb", "#16a36a", "#f59e0b",
                        "#e34c65", "#8b5cf6", "#06b6d4",
                        "#f97316", "#64748b"
                    ],
                    borderWidth: 2,
                    borderColor: "#fff"
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: "bottom" }
                }
            }
        }
    );

    analyticsChart = new Chart(
        document.getElementById("analyticsChart"), {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Expenses",
                    data: values,
                    backgroundColor: "#2563eb",
                    borderRadius: 7
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        }
    );
}

// Sidebar navigation
document.querySelectorAll(".sidebar a").forEach(link => {
    link.addEventListener("click", e => {
        e.preventDefault();

        const page = link.dataset.page;

        document.querySelectorAll(".page").forEach(section => {
            section.classList.add("hidden");
        });

        document.getElementById(page).classList.remove("hidden");

        document.querySelectorAll(".sidebar a").forEach(a => {
            a.classList.remove("active");
        });

        link.classList.add("active");

        const titles = {
            dashboard: "Dashboard",
            transactions: "Transactions",
            budget: "Monthly Budget",
            analytics: "Analytics"
        };

        document.getElementById("pageTitle").textContent = titles[page];
    });
});

document.getElementById("search").addEventListener("input", renderTransactions);
document.getElementById("filter").addEventListener("change", renderTransactions);

render();
