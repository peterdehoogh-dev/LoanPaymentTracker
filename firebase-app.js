import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyBvy3vhe0CYe9WpMwRwu_O56nWDNzbYhIE",
  authDomain: "loanpaymenttracker-d9df1.firebaseapp.com",
  projectId: "loanpaymenttracker-d9df1",
  storageBucket: "loanpaymenttracker-d9df1.firebasestorage.app",
  messagingSenderId: "562657217639",
  appId: "1:562657217639:web:b69447974ae3fe390d18c2"
};


const ADMIN_UID = "dHZuYi41gXNgoNvOSGjR5t2LjZ23";

const firebaseApp = initializeApp(firebaseConfig);
const database = getFirestore(firebaseApp);
const authentication = getAuth(firebaseApp);

const paymentDocument = doc(database, "loan", "payments");
const updatedPayments = {
  ...paid,
  [checkbox.dataset.number]: checkbox.checked
};

const PRINCIPAL = 10000;
const MONTHLY_RATE = 0.083 / 12;
const MONTHLY_PAYMENT = 176;

let paid = {};
let currentUser = null;
let schedule = [];
let balance = PRINCIPAL;


const euro = value =>
  "€" +
  value.toLocaleString("en-IE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });


for (let index = 0; index < 72; index++) {
  const startingBalance = balance;
  const interest = startingBalance * MONTHLY_RATE;
  const principalPaid = MONTHLY_PAYMENT - interest;

  balance = startingBalance - principalPaid;

  schedule.push({
    number: index + 1,
    loanYear: Math.floor(index / 12) + 1,
    dueDate: new Date(2026, 9 + index, 27),
    startingBalance,
    principalPaid,
    remainingBalance: balance
  });
}


function isAdmin() {
  return currentUser && currentUser.uid === ADMIN_UID;
}


function isOverdue(payment) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return payment.dueDate < today && !paid[payment.number];
}


function updateAdminButton() {
  const button = document.getElementById("admin");

  if (isAdmin()) {
    button.textContent = "Admin logout";
  } else {
    button.textContent = "Admin login";
  }
}


function render() {
  const year = Number(document.getElementById("year").value);

  const visiblePayments = schedule.filter(
    payment => payment.loanYear === year
  );

  const totalPrincipalPaid = schedule.reduce(
    (total, payment) =>
      total +
      (paid[payment.number] ? payment.principalPaid : 0),
    0
  );

  document.getElementById("balance").textContent =
    euro(Math.max(0, PRINCIPAL - totalPrincipalPaid));


  const overduePayments = schedule.filter(isOverdue);
  const alertBox = document.getElementById("alert");

  if (overduePayments.length > 0) {
    alertBox.className = "alert bad";

    document.getElementById("alertTitle").textContent =
      "Overdue payment";

    document.getElementById("alertText").textContent =
      overduePayments.length +
      " payment" +
      (overduePayments.length === 1 ? " is" : "s are") +
      " overdue";
  } else {
    alertBox.className = "alert";

    document.getElementById("alertTitle").textContent =
      "Payments up to date";

    document.getElementById("alertText").textContent =
      "No overdue instalments";
  }


  document.getElementById("yearTitle").textContent =
    "Loan year " + year;

  document.getElementById("period").textContent =
    visiblePayments[0].dueDate.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric"
    }) +
    " to " +
    visiblePayments[
      visiblePayments.length - 1
    ].dueDate.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric"
    }) +
    " · Due on the 27th of each month";


  let tableRows = "";

  visiblePayments.forEach(payment => {
    const paymentIsPaid = Boolean(paid[payment.number]);
    const paymentIsOverdue = isOverdue(payment);

    let status;

    if (isAdmin()) {
      status =
        '<label class="' +
        (paymentIsOverdue
          ? "overdue"
          : paymentIsPaid
          ? "paid"
          : "pending") +
        '">' +
        '<input type="checkbox" data-number="' +
        payment.number +
        '" ' +
        (paymentIsPaid ? "checked" : "") +
        "> €176.00</label>";
    } else {
      status =
        '<span class="' +
        (paymentIsOverdue
          ? "overdue"
          : paymentIsPaid
          ? "paid"
          : "pending") +
        '">' +
        (paymentIsPaid
          ? "✓ Paid"
          : paymentIsOverdue
          ? "€176.00 · Overdue"
          : "Not yet due") +
        "</span>";
    }

    tableRows +=
      "<tr>" +
      "<td><strong>" +
      payment.dueDate.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric"
      }) +
      "</strong><br><small>Due 27th</small></td>" +
      "<td>" +
      euro(payment.startingBalance) +
      "</td>" +
      "<td><strong>" +
      euro(payment.remainingBalance) +
      "</strong></td>" +
      "<td>" +
      status +
      "</td>" +
      "</tr>";
  });


  document.getElementById("rows").innerHTML = tableRows;

  document
    .querySelectorAll("input[data-number]")
    .forEach(checkbox => {
      checkbox.addEventListener("change", async () => {
        if (!isAdmin()) {
          return;
        }

        const paymentNumber = checkbox.dataset.number;
        const updatedPayments = {
          ...paid,
          [paymentNumber]: checkbox.checked
        };

        checkbox.disabled = true;

        try {
          await setDoc(
            paymentDocument,
            {
              paid: updatedPayments,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser.uid
            },
            { merge: true }
          );
        } catch (error) {
          console.error("Payment could not be saved:", error);

            "The payment could not be saved. Please check your administrator login."
          );

          checkbox.disabled = false;
        }
      });
    });

  updateAdminButton();
}


function createLoginWindow() {
  const existingWindow = document.getElementById("loginOverlay");

  if (existingWindow) {
    existingWindow.remove();
  }

  const overlay = document.createElement("div");
  overlay.id = "loginOverlay";

  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(15,23,42,.72);" +
    "display:flex;align-items:center;justify-content:center;" +
    "padding:20px;z-index:9999;";

  overlay.innerHTML = `
    <div style="
      width:100%;
      max-width:380px;
      background:white;
      padding:26px;
      border-radius:18px;
      box-shadow:0 20px 50px rgba(0,0,0,.3);
    ">
      <h2 style="margin-top:0;">Administrator login</h2>

      <p style="color:#64748b;font-size:14px;">
        Only the loan administrator can change payment status.
      </p>

      <label style="display:block;margin-top:18px;font-weight:bold;">
        Email address
      </label>

      <input
        id="loginEmail"
        type="email"
        autocomplete="username"
        style="
          width:100%;
          margin-top:7px;
          padding:11px;
          border:1px solid #cbd5e1;
          border-radius:8px;
          box-sizing:border-box;
        "
      >

      <label style="display:block;margin-top:15px;font-weight:bold;">
        Password
      </label>

      <input
        id="loginPassword"
        type="password"
        autocomplete="current-password"
        style="
          width:100%;
          margin-top:7px;
          padding:11px;
          border:1px solid #cbd5e1;
          border-radius:8px;
          box-sizing:border-box;
        "
      >

      <p
        id="loginError"
        style="
          display:none;
          color:#b91c1c;
          font-size:13px;
          margin-bottom:0;
        "
      ></p>

      <div style="
        display:flex;
        justify-content:flex-end;
        gap:10px;
        margin-top:22px;
      ">
        <button
          id="cancelLogin"
          style="
            background:#e2e8f0;
            color:#0f172a;
          "
        >
          Cancel
        </button>

        <button id="submitLogin">
          Sign in
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("cancelLogin").onclick = () => {
    overlay.remove();
  };

  document.getElementById("submitLogin").onclick = async () => {
    const email =
      document.getElementById("loginEmail").value.trim();

    const password =
      document.getElementById("loginPassword").value;

    const errorMessage =
      document.getElementById("loginError");

    errorMessage.style.display = "none";

    try {
      await signInWithEmailAndPassword(
        authentication,
        email,
        password
      );

      overlay.remove();
    } catch (error) {
      console.error("Login failed:", error);

      errorMessage.textContent =
        "Login failed. Check your email address and password.";

      errorMessage.style.display = "block";
    }
  };
}


document
  .getElementById("year")
  .addEventListener("change", render);


document
  .getElementById("admin")
  .addEventListener("click", async () => {
    if (currentUser) {
      await signOut(authentication);
    } else {
      createLoginWindow();
    }
  });


onAuthStateChanged(authentication, user => {
  currentUser = user;

  if (currentUser && currentUser.uid !== ADMIN_UID) {
    signOut(authentication);
    alert("This account does not have administrator access.");
    return;
  }

  render();
});


onSnapshot(
  paymentDocument,
  documentSnapshot => {
    if (documentSnapshot.exists()) {
      paid = documentSnapshot.data().paid || {};
    } else {
      paid = {};
    }

    render();
  },
  error => {
    console.error("Payments could not be loaded:", error);

    document.getElementById("alert").className = "alert bad";
    document.getElementById("alertTitle").textContent =
      "Connection error";
    document.getElementById("alertText").textContent =
      "The shared payment status could not be loaded.";
  }
);


render();
