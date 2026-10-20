window.onload = function () {
    if (localStorage.getItem("lembrar") === "true") {
        document.getElementById("login").value = localStorage.getItem("loginlembrado");
        document.getElementById("senha").value = localStorage.getItem("senhalembrado");
        document.getElementById("Lembre-me").checked = true;
    }
};

function logar() {
    let login = document.getElementById("login").value;
    let senha = document.getElementById("senha").value;
    let lembrar = document.getElementById("Lembre-me").checked;

    if (login === "admin@gmail.com" && senha === "1234") {
        localStorage.setItem("tipoUsuario", "admin");

        if (lembrar) {
            localStorage.setItem("lembrar", "true");
            localStorage.setItem("loginlembrado", login);
            localStorage.setItem("senhalembrado", senha);
        } else {
            localStorage.removeItem("lembrar");
            localStorage.removeItem("loginlembrado");
            localStorage.removeItem("senhalembrado");
        }

        window.location.href = "tomatrix.html";
    } else {
        alert("Usuário ou senha incorretos!");
    }
}

function mostrarsenha() {
    const input = document.getElementById("senha");
    const icone = document.getElementById("btn-senha");

    if (input.type === "password") {
        input.type = "text";
        icone.classList.remove("bx-show");
        icone.classList.add("bx-hide");
    } else {
        input.type = "password";
        icone.classList.remove("bx-hide");
        icone.classList.add("bx-show");
    }
}