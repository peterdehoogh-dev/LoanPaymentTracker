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

const PRINCIPAL = 10000;
const ANNUAL_RATE = 0.083;
const MONTHLY_RATE = ANNUAL_RATE / 12;
const MONTHLY_PAYMENT = 176;
const NUMBER_OF_MONTHS = 72;


const firebaseApp = initializeApp(firebaseConfig);
const database = getFirestore(firebaseApp);
const authentication = getAuth(firebaseApp);

const paymentDocument = doc(
  database,
  "loan",
  "payments"
);


let paid = {};
let currentUser = null;
let schedule = [];


const euro = value =>
  "€" +
  value.toLocaleString("en-IE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });


function createSchedule() {
  let balance = PRINCIPAL;
  const result = [];

  for (let index = 0; index < NUMBER_OF_MONTHS; index++) {
    const startingBalance = balance;
    const interest = startingBalance * MONTHLY_RATE;
    const principalPaid = MONTHLY_PAYMENT - interest;

    balance = Math.max(
      0,
      startingBalance - principalPaid
    );

    result.push({
      number: index + 1,
      loanYear: Math.floor(index / 12) + 1,
      dueDate: new Date(2026, 9 + index, 27),
      startingBalance,
      principalPaid,
      remainingBalance: balance
    });
  }

  return result;
}


schedule = createSchedule();


function userIsAdmin() {
  return Boolean(
    currentUser &&
    currentUser.uid === ADMIN_UID
  );
}


function paymentIsOverdue(payment) {
  const today = new Date();

  today.setHours(23, 59, 59, 999);

  return (
    payment.dueDate < today &&
    !paid[payment.number]
  );
}


function updateAdminButton() {
  const adminButton =
    document.getElementById("admin");

  if (!adminButton) {
    return;
  }

  adminButton.textContent =
    userIsAdmin()
      ? "Admin logout"
      : "Admin login";
}


function updateHeader() {
  const totalPrincipalPaid =
    schedule.reduce(
      (total, payment) => {
        if (paid[payment.number]) {
          return total + payment.principalPaid;
        }

        return total;
      },
      0
    );

  const outstandingBalance =
    Math.max(
      0,
      PRINCIPAL - totalPrincipalPaid
    );

  document.getElementById("balance").textContent =
    euro(outstandingBalance);


  const overduePayments =
    schedule.filter(paymentIsOverdue);

  const alertBox =
    document.getElementById("alert");

  const alertTitle =
    document.getElementById("alertTitle");

  const alertText =
    document.getElementById("alertText");


  if (overduePayments.length > 0) {
    alertBox.className = "alert bad";

    alertTitle.textContent =
      "Overdue payment";

    alertText.textContent =
      overduePayments.length +
      " payment" +
      (
        overduePayments.length === 1
          ? " is"
          : "s are"
      ) +
      " overdue";
  } else {
    alertBox.className = "alert";

    alertTitle.textContent =
      "Payments up to date";

    alertText.textContent =
      "No overdue instalments";
  }
}


function createStatusElement(payment) {
  const paymentIsPaid =
    Boolean(paid[payment.number]);

  const overdue =
    paymentIsOverdue(payment);


  if (userIsAdmin()) {
    const label =
      document.createElement("label");

    label.className =
      overdue
        ? "overdue"
        : paymentIsPaid
        ? "paid"
        : "pending";


    const checkbox =
      document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = paymentIsPaid;
    checkbox.dataset.number =
      String(payment.number);

    checkbox.style.marginRight = "8px";


    checkbox.addEventListener(
      "change",
      async () => {
        if (!userIsAdmin()) {
          return;
        }

        checkbox.disabled = true;

        const paymentNumber =
          checkbox.dataset.number;

        const updatedPayments = {
          ...paid,
          [paymentNumber]: checkbox.checked
        };


        try {
          await setDoc(
            paymentDocument,
            {
              paid: updatedPayments,
              updatedAt:
                new Date().toISOString(),
              updatedBy:
                currentUser.uid
            },
            {
              merge: true
            }
          );
        } catch (error) {
          console.error(
            "Payment could not be saved:",
            error
          );

          alert(
            "The payment could not be saved. " +
            "Please check your administrator login."
          );

          checkbox.disabled = false;
        }
      }
    );


    label.appendChild(checkbox);

    label.appendChild(
      document.createTextNode(
        euro(MONTHLY_PAYMENT)
      )
    );

    return label;
  }


  const status =
    document.createElement("span");

  status.className =
    overdue
      ? "overdue"
      : paymentIsPaid
      ? "paid"
      : "pending";


  if (paymentIsPaid) {
    status.textContent = "✓ Paid";
  } else if (overdue) {
    status.textContent =
      euro(MONTHLY_PAYMENT) +
      " · Overdue";
  } else {
    status.textContent =
      "Not yet due";
  }

  return status;
}


function renderTable() {
  const selectedYear =
    Number(
      document.getElementById("year").value
    );

  const visiblePayments =
    schedule.filter(
      payment =>
        payment.loanYear === selectedYear
    );


  document.getElementById(
    "yearTitle"
  ).textContent =
    "Loan year " + selectedYear;


  const firstPayment =
    visiblePayments[0];

  const lastPayment =
    visiblePayments[
      visiblePayments.length - 1
    ];


  document.getElementById(
    "period"
  ).textContent =
    firstPayment.dueDate.toLocaleDateString(
      "en-GB",
      {
        month: "long",
        year: "numeric"
      }
    ) +
    " to " +
    lastPayment.dueDate.toLocaleDateString(
      "en-GB",
      {
        month: "long",
        year: "numeric"
      }
    ) +
    " · Due on the 27th of each month";


  const tableBody =
    document.getElementById("rows");

  tableBody.innerHTML = "";


  visiblePayments.forEach(payment => {
    const row =
      document.createElement("tr");


    if (paid[payment.number]) {
      row.style.background = "#f0fdf4";
    }


    const monthCell =
      document.createElement("td");

    const monthName =
      payment.dueDate.toLocaleDateString(
        "en-GB",
        {
          month: "long",
          year: "numeric"
        }
      );

    monthCell.innerHTML =
      "<strong>" +
      monthName +
      "</strong><br>" +
      "<small>Due 27th</small>";


    const startingBalanceCell =
      document.createElement("td");

    startingBalanceCell.textContent =
      euro(payment.startingBalance);


    const remainingBalanceCell =
      document.createElement("td");

    remainingBalanceCell.innerHTML =
      "<strong>" +
      euro(payment.remainingBalance) +
      "</strong>";


    const statusCell =
      document.createElement("td");

    statusCell.appendChild(
      createStatusElement(payment)
    );


    row.appendChild(monthCell);
    row.appendChild(startingBalanceCell);
    row.appendChild(remainingBalanceCell);
    row.appendChild(statusCell);

    tableBody.appendChild(row);
  });
}


function render() {
  updateHeader();
  updateAdminButton();
  renderTable();
}


function showLoginWindow() {
  const existingOverlay =
    document.getElementById(
      "loginOverlay"
    );

  if (existingOverlay) {
    existingOverlay.remove();
  }


  const overlay =
    document.createElement("div");

  overlay.id = "loginOverlay";

  overlay.style.cssText =
    "position:fixed;" +
    "inset:0;" +
    "background:rgba(15,23,42,.75);" +
    "display:flex;" +
    "align-items:center;" +
    "justify-content:center;" +
    "padding:20px;" +
    "z-index:9999;";


  overlay.innerHTML = `
    <div style="
      width:100%;
      max-width:380px;
      background:white;
      padding:26px;
      border-radius:18px;
      box-shadow:0 20px 50px rgba(0,0,0,.3);
    ">
      <h2 style="margin-top:0;">
        Administrator login
      </h2>

      <p style="
        color:#64748b;
        font-size:14px;
        line-height:1.5;
      ">
        Only the loan administrator can
        change payment status.
      </p>

      <label style="
        display:block;
        margin-top:18px;
        font-weight:bold;
      ">
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

      <label style="
        display:block;
        margin-top:15px;
        font-weight:bold;
      ">
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
          type="button"
          style="
            background:#e2e8f0;
            color:#0f172a;
          "
        >
          Cancel
        </button>

        <button
          id="submitLogin"
          type="button"
        >
          Sign in
        </button>
      </div>
    </div>
  `;


  document.body.appendChild(overlay);


  document.getElementById(
    "cancelLogin"
  ).addEventListener(
    "click",
    () => {
      overlay.remove();
    }
  );


  document.getElementById(
    "submitLogin"
  ).addEventListener(
    "click",
    async () => {
      const email =
        document
          .getElementById("loginEmail")
          .value
          .trim();

      const password =
        document
          .getElementById("loginPassword")
          .value;

      const errorMessage =
        document.getElementById(
          "loginError"
        );


      errorMessage.style.display =
        "none";


      try {
        await signInWithEmailAndPassword(
          authentication,
          email,
          password
        );

        overlay.remove();
      } catch (error) {
        console.error(
          "Login failed:",
          error
        );

        errorMessage.textContent =
          "Login failed. Check your email address and password.";

        errorMessage.style.display =
          "block";
      }
    }
  );
}


document
  .getElementById("year")
  .addEventListener(
    "change",
    render
  );


document
  .getElementById("admin")
  .addEventListener(
    "click",
    async () => {
      if (currentUser) {
        await signOut(authentication);
      } else {
        showLoginWindow();
      }
    }
  );


onAuthStateChanged(
  authentication,
  async user => {
    if (
      user &&
      user.uid !== ADMIN_UID
    ) {
      await signOut(authentication);

      currentUser = null;

      alert(
        "This account does not have administrator access."
      );

      render();

      return;
    }

    currentUser = user;

    render();
  }
);


onSnapshot(
  paymentDocument,
  documentSnapshot => {
    if (documentSnapshot.exists()) {
      const documentData =
        documentSnapshot.data();

      paid =
        documentData.paid || {};
    } else {
      paid = {};
    }

    render();
  },
  error => {
    console.error(
      "Payments could not be loaded:",
      error
    );

    const alertBox =
      document.getElementById("alert");

    alertBox.className =
      "alert bad";

    document.getElementById(
      "alertTitle"
    ).textContent =
      "Connection error";

    document.getElementById(
      "alertText"
    ).textContent =
      "The shared payment status could not be loaded.";
  }
);


render();
