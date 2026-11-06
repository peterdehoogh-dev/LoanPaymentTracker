const P = 10000;
const R = 0.083 / 12;
const PAY = 176;

let admin = false;
let paid = {};

try {
  paid = JSON.parse(localStorage.getItem("loan-paid-months") || "{}");
} catch {
  paid = {};
}

const euro = n =>
  "€" +
  n.toLocaleString("en-IE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

let schedule = [];
let bal = P;

for (let i = 0; i < 72; i++) {
  const start = bal;
  const interest = start * R;
  const principal = PAY - interest;

  bal = start - principal;

  schedule.push({
    n: i + 1,
    year: Math.floor(i / 12) + 1,
    date: new Date(2026, 9 + i, 27),
    start,
    principal,
    remaining: bal
  });
}

function overdue(x) {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  return x.date < now && !paid[x.n];
}

function render() {
  const year = Number(document.getElementById("year").value);
  const list = schedule.filter(x => x.year === year);

  const principalPaid = schedule.reduce(
    (sum, x) => sum + (paid[x.n] ? x.principal : 0),
    0
  );

  document.getElementById("balance").textContent =
    euro(Math.max(0, P - principalPaid));

  const late = schedule.filter(overdue);
  const alert = document.getElementById("alert");

  if (late.length) {
    alert.className = "alert bad";
    document.getElementById("alertTitle").textContent =
      "Overdue payment";

    document.getElementById("alertText").textContent =
      late.length +
      " payment" +
      (late.length === 1 ? " is" : "s are") +
      " overdue";
  } else {
    alert.className = "alert";

    document.getElementById("alertTitle").textContent =
      "Payments up to date";

    document.getElementById("alertText").textContent =
      "No overdue instalments";
  }

  document.getElementById("yearTitle").textContent =
    "Loan year " + year;

  document.getElementById("period").textContent =
    list[0].date.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric"
    }) +
    " to " +
    list[list.length - 1].date.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric"
    });

  let html = "";

  list.forEach(x => {
    const isPaid = Boolean(paid[x.n]);
    const late = overdue(x);

    let status;

    if (admin) {
      status =
        '<label class="' +
        (late ? "overdue" : isPaid ? "paid" : "pending") +
        '">' +
        '<input type="checkbox" data-n="' +
        x.n +
        '" ' +
        (isPaid ? "checked" : "") +
        '> €176.00</label>';
    } else {
      status =
        '<span class="' +
        (late ? "overdue" : isPaid ? "paid" : "pending") +
        '">' +
        (isPaid
          ? "✓ Paid"
          : late
          ? "€176.00 · Overdue"
          : "Not yet due") +
        "</span>";
    }

    html +=
      "<tr>" +
      "<td><strong>" +
      x.date.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric"
      }) +
      "</strong><br><small>Due 27th</small></td>" +
      "<td>" +
      euro(x.start) +
      "</td>" +
      "<td><strong>" +
      euro(x.remaining) +
      "</strong></td>" +
      "<td>" +
      status +
      "</td>" +
      "</tr>";
  });

  document.getElementById("rows").innerHTML = html;

  document.querySelectorAll("input[data-n]").forEach(box => {
    box.addEventListener("change", () => {
      paid[box.dataset.n] = box.checked;

      localStorage.setItem(
        "loan-paid-months",
        JSON.stringify(paid)
      );

      render();
    });
  });
}

document.getElementById("year").addEventListener("change", render);

document.getElementById("admin").addEventListener("click", () => {
  admin = !admin;

  document.getElementById("admin").textContent =
    admin ? "Viewer mode" : "Admin preview";

  render();
});

render();
