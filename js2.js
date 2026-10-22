/* Login con roles: 1 administrador y 2 usuarios.
   Las cuentas están aquí porque el proyecto no usa base de datos. */

const USUARIOS = [
  { usuario: "eli", clave: "12345", rol: "admin", nombre: "Elí" },
  { usuario: "juan", clave: "1234", rol: "usuario", nombre: "Juan" },
  { usuario: "maria", clave: "1234", rol: "usuario", nombre: "María" }
];

const CLAVE_SESION = "snt_sesion";

const PAGINA_POR_ROL = {
  admin: "admin.html",
  usuario: "user.html"
};

function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_SESION) || "null");
  } catch (error) {
    return null;
  }
}

const formLogin = document.getElementById("login");
const mensajeLogin = document.getElementById("mensajeLogin");

function mostrarError(texto) {
  mensajeLogin.textContent = texto;
  mensajeLogin.classList.remove("exito");
}

// Si ya hay una sesión activa, no tiene sentido volver a loguearse.
const sesionActiva = leerSesion();
if (sesionActiva && PAGINA_POR_ROL[sesionActiva.rol]) {
  window.location.replace(PAGINA_POR_ROL[sesionActiva.rol]);
}

formLogin.addEventListener("submit", function (e) {
  e.preventDefault(); // evita que se envíe el formulario

  const rolElegido = document.getElementById("rol").value;
  const usuario = document.getElementById("usua").value.trim();
  const clave = document.getElementById("contra").value;

  if (usuario === "" || clave === "") {
    mostrarError("Debe escribir el usuario y la contraseña.");
    return;
  }

  const cuenta = USUARIOS.find(function (u) {
    return u.usuario.toLowerCase() === usuario.toLowerCase();
  });

  if (!cuenta || cuenta.clave !== clave) {
    mostrarError("Usuario o contraseña incorrectos.");
    return;
  }

  if (cuenta.rol !== rolElegido) {
    mostrarError(
      "La cuenta \"" + cuenta.usuario + "\" es de tipo " +
      (cuenta.rol === "admin" ? "Administrador" : "Usuario") +
      ". Cambie la opción \"Ingresar como\"."
    );
    return;
  }

  // Guardamos la sesión (local) y redirigimos según el rol.
  localStorage.setItem(CLAVE_SESION, JSON.stringify({
    usuario: cuenta.usuario,
    nombre: cuenta.nombre,
    rol: cuenta.rol,
    inicio: new Date().toISOString()
  }));

  window.location.href = PAGINA_POR_ROL[cuenta.rol];
});
