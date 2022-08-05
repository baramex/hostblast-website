import axios from "axios";
import Cookies from 'js-cookie';

function App() {
  return (
    <>
      <button onClick={getUser}>Get user</button>
      <button onClick={refreshSession}>Refresh session</button>
      <button onClick={disconnect}>Disconnect</button>

      <h1>Login</h1>
      <form onSubmit={login}>
        <input type="email" name="email" placeholder="Email" />
        <input type="password" name="password" placeholder="Mot de passe" />
        <input type="submit" value="Se connecter" />
      </form>

      <h1>Signup</h1>
      <form onSubmit={signup}>
        <input type="text" name="firstname" placeholder="Prénom" />
        <input type="text" name="lastname" placeholder="Nom" />
        <input type="email" name="email" placeholder="Email" />
        <input type="password" name="password" placeholder="Mot de passe" />
        <input type="submit" value="S'inscrire" />
      </form>

      <button onClick={() => getProduces("vps")}>Get produces vps</button>
      <div id="produces-container"></div>

      <button onClick={getCart}>Get cart</button>
      <div id="cart"></div>

      <button onClick={buyCart}>Purchase cart</button>
    </>
  );
}

function login(e) {
  e.preventDefault();

  var email = e.target.querySelector("[name=email]").value;
  var password = e.target.querySelector("[name=password]").value;

  axios.post("http://localhost:3001/api/auth/login", { email, password }, { withCredentials: true }).then(({ data }) => {
    alert("Logged in ! ");
  }, err => {
    alert("Error: " + err.response?.data);
  });
}

function signup(e) {
  e.preventDefault();

  var firstname = e.target.querySelector("[name=firstname]").value;
  var lastname = e.target.querySelector("[name=lastname]").value;
  var email = e.target.querySelector("[name=email]").value;
  var password = e.target.querySelector("[name=password]").value;

  axios.post("http://localhost:3001/api/user", { firstname, lastname, email, password }, { withCredentials: true }).then(({ data }) => {
    alert("Signed up ! ");
  }, err => {
    alert("Error: " + err.response?.data);
  });
}

function getUser() {
  var token = Cookies.get("token");
  if (token) {
    axios.get("http://localhost:3001/api/user/@me", { withCredentials: true }).then(({ data }) => {
      alert(JSON.stringify(data));
    }, err => {
      alert("Error: " + err.response?.data);
    });
  }
}

function refreshSession() {
  var refreshToken = Cookies.get("refresh");
  if (refreshToken) {
    axios.post("http://localhost:3001/api/auth/refresh", {}, { withCredentials: true }).then(({ data }) => {
      alert("Refreshed !");
    }, err => {
      alert("Error: " + err.response?.data);
    });
  }
}

function disconnect() {
  var token = Cookies.get("token");
  if (token) {
    axios.post("http://localhost:3001/api/auth/disconnect", {}, { withCredentials: true }).then(({ data }) => {
      alert("disconnected !");
      Cookies.remove("token");
      Cookies.remove("refresh");
    }, err => {
      alert("Error: " + err.response?.data);
    });
  }
}

function getProduces(type) {
  axios.get("http://localhost:3001/api/produces/" + type).then(({ data }) => {
    var parent = document.getElementById("produces-container");
    parent.innerHTML = data.map(a =>
      `<div class="p-4 bg-secondary" style="max-width: 250px">
        <h1>${a.name}</h1>
        <span>${a.price} €</span>
        <button onclick="${buyItem(a._id)}">buy</button>
      </div>`
    ).join("");
  }, err => {
    alert("Error: " + err.response?.data);
  });
}

function buyItem(id) {
  axios.put("http://localhost:3001/api/user/@me/cart", { id, configuration: [] }, { withCredentials: true }).then(({ data }) => {
    alert("added to cart !");
  }, err => {
    alert("Error: " + err.response?.data);
  });
}

function getCart() {
  axios.get("http://localhost:3001/api/user/@me/cart", { withCredentials: true }).then(({ data }) => {
    var parent = document.getElementById("cart");
    parent.innerHTML = data.map(a =>
      `<div class="p-4 bg-secondary" style="max-width: 250px">
        <h1>${a.id}</h1>
        <span>x${a.quantity}</span>
        <button>remove</button>
      </div>`
    ).join("");
  }, err => {
    alert("Error: " + err.response?.data);
  });
}

function buyCart() {
  axios.post("http://localhost:3001/api/payment/paypal", {}, { withCredentials: true }).then(({ data }) => {
    window.location.href = data.redirect_url
  }, err => {
    alert("Error: " + err.response?.data);
  });
}

export default App;
