/* Lógica compartida de admin.html y user.html.
   - Los equipos se guardan en localStorage (nada de base de datos).
   - El administrador puede registrar y actualizar.
   - Un usuario solo puede registrar: no se le muestra el botón de actualizar.
   - No existe botón de eliminar. */

(function () {
  "use strict";

  const CLAVE_EQUIPOS = "snt_equipos";
  const CLAVE_SESION = "snt_sesion";

  const CAMPOS = [
    "cliente", "nit", "direccion", "contacto", "medioPago", "servicio",
    "fechaIngreso", "horaIngreso", "equipo", "marca", "serial", "estado", "tecnico",
    "suministroInsumo", "suministroHerramienta", "suministroTardo"
  ];

  // Suministros que el técnico usa en el servicio (always 3: insumo, herramienta y tardo).
  const SUMINISTROS = ["suministroInsumo", "suministroHerramienta", "suministroTardo"];

  /* ---------------- Sesión y permisos ---------------- */

  function leerSesion() {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_SESION) || "null");
    } catch (error) {
      return null;
    }
  }

  const sesion = leerSesion();
  const pagina = document.body.dataset.pagina || "usuario";

  // Sin sesión no se puede entrar a ninguna de las dos páginas.
  if (!sesion || !sesion.rol) {
    window.location.replace("index.html");
    return;
  }

  // Cada rol tiene su página: el usuario no entra al panel del admin.
  if (pagina === "admin" && sesion.rol !== "admin") {
    window.location.replace("user.html");
    return;
  }
  if (pagina === "usuario" && sesion.rol === "admin") {
    window.location.replace("admin.html");
    return;
  }

  const esAdmin = sesion.rol === "admin";

  /* ---------------- Elementos del DOM ---------------- */

  const barraSesion = document.getElementById("barraSesion");
  const form = document.getElementById("formEquipo");
  const mensaje = document.getElementById("mensaje");
  const cuerpo = document.getElementById("cuerpoTabla");
  const contador = document.getElementById("contador");
  const btnGuardar = document.getElementById("btnGuardar");
  const btnCancelar = document.getElementById("btnCancelar");
  const tituloFormulario = document.getElementById("tituloFormulario");
  const buscador = document.getElementById("buscador");
  const btnSuministros = document.getElementById("btnSuministros");
  const miniSuministros = document.getElementById("miniSuministros");

  let idEdicion = null;   // null = se está registrando uno nuevo
  let filtro = "";

  /* ---------------- Barra de sesión ---------------- */

  function pintarBarraSesion() {
    if (!barraSesion) return;

    const texto = document.createElement("span");
    texto.textContent = "Sesión: " + sesion.nombre +
      " (" + (esAdmin ? "Administrador" : "Usuario") + ")";

    const salir = document.createElement("button");
    salir.type = "button";
    salir.className = "cerrar-sesion";
    salir.textContent = "Cerrar sesión";
    salir.addEventListener("click", function () {
      localStorage.removeItem(CLAVE_SESION);
      window.location.replace("index.html");
    });

    barraSesion.appendChild(texto);
    barraSesion.appendChild(salir);
  }

  /* ---------------- Datos ---------------- */

  function leerEquipos() {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE_EQUIPOS) || "[]");
      return Array.isArray(datos) ? datos : [];
    } catch (error) {
      return [];
    }
  }

  function guardarEquipos(equipos) {
    localStorage.setItem(CLAVE_EQUIPOS, JSON.stringify(equipos));
  }

  function nuevoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------------- Mensajes ---------------- */

  function mostrarMensaje(texto, tipo) {
    mensaje.textContent = texto;
    mensaje.classList.toggle("exito", tipo === "exito");
  }

  function limpiarMensaje() {
    mensaje.textContent = "";
    mensaje.classList.remove("exito");
  }

  /* ---------------- Validaciones ---------------- */

  function marcarError(id, hayError) {
    const campo = document.getElementById(id);
    if (campo) campo.classList.toggle("error", hayError);
  }

  function limpiarErrores() {
    CAMPOS.forEach(function (id) { marcarError(id, false); });
  }

  // Devuelve { valido, datos, errores }
  function validarFormulario() {
    limpiarErrores();

    const datos = {};
    CAMPOS.forEach(function (id) {
      datos[id] = document.getElementById(id).value.trim();
    });

    const errores = [];

    // Cliente: obligatorio, mínimo 3 letras
    if (datos.cliente === "") {
      errores.push("El cliente es obligatorio.");
      marcarError("cliente", true);
    } else if (datos.cliente.length < 3) {
      errores.push("El nombre del cliente debe tener al menos 3 caracteres.");
      marcarError("cliente", true);
    } else if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]+$/.test(datos.cliente)) {
      errores.push("El cliente solo puede tener letras, espacios, puntos y guiones.");
      marcarError("cliente", true);
    }

    // NIT/CC: obligatorio, solo números y un guion de verificación
    if (datos.nit === "") {
      errores.push("El NIT/CC es obligatorio.");
      marcarError("nit", true);
    } else if (!/^\d{5,15}(-\d)?$/.test(datos.nit)) {
      errores.push("El NIT/CC debe tener entre 5 y 15 números (puede terminar en -1).");
      marcarError("nit", true);
    }

    // Contacto: opcional, pero si se escribe debe ser un teléfono válido
    if (datos.contacto !== "") {
      const soloDigitos = datos.contacto.replace(/[\s-]/g, "");
      if (!/^\d{7,10}$/.test(soloDigitos)) {
        errores.push("El contacto debe tener entre 7 y 10 números.");
        marcarError("contacto", true);
      }
    }

    // Dirección: opcional, máximo 80 caracteres
    if (datos.direccion.length > 80) {
      errores.push("La dirección no puede superar los 80 caracteres.");
      marcarError("direccion", true);
    }

    // Fecha y hora de ingreso: obligatorias
    if (datos.fechaIngreso === "") {
      errores.push("La fecha de ingreso es obligatoria.");
      marcarError("fechaIngreso", true);
    }

    if (datos.horaIngreso === "") {
      errores.push("La hora de ingreso es obligatoria.");
      marcarError("horaIngreso", true);
    }

    // Serial: si se escribe, no puede repetirse en otro equipo
    if (datos.serial !== "") {
      const repetido = leerEquipos().some(function (equipo) {
        return equipo.id !== idEdicion &&
          equipo.serial.toLowerCase() === datos.serial.toLowerCase();
      });
      if (repetido) {
        errores.push("Ya existe un equipo registrado con el serial \"" + datos.serial + "\".");
        marcarError("serial", true);
      }
    }

    // Suministros: opcionales, máximo 60 caracteres cada uno
    const nombresSuministros = {
      suministroInsumo: "insumo",
      suministroHerramienta: "herramienta",
      suministroTardo: "tardo"
    };
    Object.keys(nombresSuministros).forEach(function (id) {
      if (datos[id].length > 60) {
        errores.push("El " + nombresSuministros[id] + " no puede superar los 60 caracteres.");
        marcarError(id, true);
      }
    });

    return { valido: errores.length === 0, datos: datos, errores: errores };
  }

  /* ---------------- Formulario ---------------- */

  function valoresIniciales() {
    const hoy = new Date();
    const fecha = hoy.getFullYear() + "-" +
      String(hoy.getMonth() + 1).padStart(2, "0") + "-" +
      String(hoy.getDate()).padStart(2, "0");
    const hora = String(hoy.getHours()).padStart(2, "0") + ":" +
      String(hoy.getMinutes()).padStart(2, "0");

    document.getElementById("fechaIngreso").value = fecha;
    document.getElementById("horaIngreso").value = hora;
    document.getElementById("tecnico").value = sesion.nombre || "";
  }

  function limpiarFormulario() {
    CAMPOS.forEach(function (id) {
      const campo = document.getElementById(id);
      if (campo.tagName === "SELECT") {
        campo.selectedIndex = 0;
      } else {
        campo.value = "";
      }
    });
    limpiarErrores();
    valoresIniciales();
  }

  function entrarEnEdicion(equipo) {
    idEdicion = equipo.id;
    CAMPOS.forEach(function (id) {
      document.getElementById(id).value = equipo[id] || "";
    });
    limpiarErrores();
    tituloFormulario.textContent = "Editar equipo de " + equipo.cliente;
    btnGuardar.textContent = "Actualizar equipo";
    btnCancelar.hidden = false;

    // Si el registro ya tiene suministros, se abre el mini formulario para verlos.
    const tieneSuministros = SUMINISTROS.some(function (id) {
      return (equipo[id] || "") !== "";
    });
    if (tieneSuministros) abrirSuministros(true);

    mostrarMensaje("Editando el registro de " + equipo.cliente + ". Cambie los datos y pulse \"Actualizar equipo\".", "exito");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function salirDeEdicion() {
    idEdicion = null;
    tituloFormulario.textContent = "Registrar equipo";
    btnGuardar.textContent = "Guardar equipo";
    btnCancelar.hidden = true;
    limpiarMensaje();
    limpiarFormulario();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Solo el administrador puede modificar registros existentes.
    if (idEdicion !== null && !esAdmin) {
      mostrarMensaje("Solo el administrador puede modificar un equipo.");
      return;
    }

    const resultado = validarFormulario();

    if (!resultado.valido) {
      mostrarMensaje(resultado.errores[0]);
      return;
    }

    const equipos = leerEquipos();

    if (idEdicion === null) {
      const equipo = Object.assign({}, resultado.datos, {
        id: nuevoId(),
        registradoPor: sesion.usuario,
        fechaRegistro: new Date().toISOString()
      });
      equipos.push(equipo);
      guardarEquipos(equipos);
      mostrarMensaje("Equipo de " + equipo.cliente + " guardado correctamente.", "exito");
    } else {
      const indice = equipos.findIndex(function (equipo) {
        return equipo.id === idEdicion;
      });

      if (indice === -1) {
        mostrarMensaje("El registro que intenta actualizar ya no existe.");
        salirDeEdicion();
        return;
      }

      equipos[indice] = Object.assign({}, equipos[indice], resultado.datos, {
        actualizadoPor: sesion.usuario,
        fechaActualizacion: new Date().toISOString()
      });
      guardarEquipos(equipos);
      mostrarMensaje("Equipo de " + resultado.datos.cliente + " actualizado correctamente.", "exito");
    }

    idEdicion = null;
    tituloFormulario.textContent = "Registrar equipo";
    btnGuardar.textContent = "Guardar equipo";
    btnCancelar.hidden = true;
    abrirSuministros(false);
    limpiarFormulario();
    filtro = "";
    buscador.value = "";
    pintarTabla();
  });

  btnCancelar.addEventListener("click", salirDeEdicion);

  /* ---------------- Mini formulario de suministros ---------------- */

  // Muestra u oculta el mini formulario con los 3 suministros del servicio.
  function abrirSuministros(abrir) {
    miniSuministros.hidden = !abrir;
    btnSuministros.setAttribute("aria-expanded", abrir ? "true" : "false");
    btnSuministros.textContent = abrir ? "Ocultar suministros" : "Suministros";
    if (abrir) {
      document.getElementById("suministroInsumo").focus();
    }
  }

  function alternarSuministros() {
    abrirSuministros(miniSuministros.hidden);
  }

  btnSuministros.addEventListener("click", alternarSuministros);

  /* ---------------- Tabla ---------------- */

  const COLUMNAS = [
    "cliente", "nit", "direccion", "contacto", "medioPago", "servicio",
    "fechaIngreso", "horaIngreso", "equipo", "marca", "serial", "estado", "tecnico",
    "suministroInsumo", "suministroHerramienta", "suministroTardo"
  ];

  function crearCelda(texto) {
    const td = document.createElement("td");
    td.textContent = texto === undefined || texto === null || texto === "" ? "—" : texto;
    return td;
  }

  function coincide(equipo) {
    if (filtro === "") return true;
    const buscado = filtro.toLowerCase();
    return [equipo.cliente, equipo.nit, equipo.serial, equipo.equipo, equipo.marca, equipo.tecnico]
      .some(function (valor) {
        return String(valor || "").toLowerCase().indexOf(buscado) !== -1;
      });
  }

  function pintarTabla() {
    const todos = leerEquipos();
    const equipos = todos.filter(coincide);

    cuerpo.innerHTML = "";

    if (equipos.length === 0) {
      const fila = document.createElement("tr");
      const celda = document.createElement("td");
      celda.colSpan = COLUMNAS.length + (esAdmin ? 1 : 0);
      celda.className = "tabla-vacia";
      celda.textContent = todos.length === 0
        ? "Todavía no hay equipos registrados."
        : "No se encontraron equipos con \"" + filtro + "\".";
      fila.appendChild(celda);
      cuerpo.appendChild(fila);
    } else {
      equipos.forEach(function (equipo) {
        const fila = document.createElement("tr");

        COLUMNAS.forEach(function (columna) {
          fila.appendChild(crearCelda(equipo[columna]));
        });

        if (esAdmin) {
          const acciones = document.createElement("td");
          acciones.className = "col-acciones";
          const boton = document.createElement("button");
          boton.type = "button";
          boton.className = "btn-accion";
          boton.textContent = "Actualizar";
          boton.addEventListener("click", function () {
            entrarEnEdicion(equipo);
          });
          acciones.appendChild(boton);
          fila.appendChild(acciones);
        }

        cuerpo.appendChild(fila);
      });
    }

    if (contador) {
      const total = todos.length;
      const mostrados = equipos.length;
      contador.textContent = filtro === ""
        ? "Total de equipos registrados: " + total
        : "Mostrando " + mostrados + " de " + total + " equipos.";
    }
  }

  /* ---------------- Buscador ---------------- */

  function aplicarBusqueda() {
    filtro = buscador.value.trim();
    pintarTabla();
  }

  document.getElementById("btnBuscar").addEventListener("click", aplicarBusqueda);
  document.getElementById("btnLimpiarBusqueda").addEventListener("click", function () {
    buscador.value = "";
    filtro = "";
    pintarTabla();
  });
  buscador.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      aplicarBusqueda();
    }
  });

  /* ---------------- Arranque ---------------- */

  // Un usuario no puede modificar: se oculta toda la columna de acciones.
  if (!esAdmin) {
    document.querySelectorAll(".col-acciones").forEach(function (elemento) {
      elemento.remove();
    });
  }

  pintarBarraSesion();
  valoresIniciales();
  pintarTabla();
})();
